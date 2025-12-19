// Simple client-side hotel billing app for cashier use

const TABLE_COUNT = 20;
const STORAGE_KEY = "hotelBillingState_v1";

const defaultQuickMenu = [
  { name: "Idli", price: 40, category: 'Breakfast' },
  { name: "Vada", price: 35, category: 'Breakfast' },
  { name: "Masala Dosa", price: 70, category: 'Breakfast' },
  { name: "Plain Dosa", price: 60, category: 'Breakfast' },
  { name: "Misal", price: 55, category: 'Breakfast' },
  { name: "Pav Bhaji", price: 50, category: 'Main' },
  { name: "Tea", price: 15, category: 'Drinks' },
  { name: "Coffee", price: 20, category: 'Drinks' },
  { name: "Juice", price: 25, category: 'Drinks' },
  { name: "Water Bottle", price: 20, category: 'Drinks' },
];

const defaultSettings = {
  hotelName: "My Hotel",
  hotelAddress: "123, Main Street, City\nPhone: 1234567890",
  taxRate: 0,
  qrText: "Thank you for visiting My Hotel",
};

let state = {
  settings: { ...defaultSettings },
  tables: {},
  currentTable: 1,
  lastInvoice: { date: '', seq: 0 },
  sales: [],
};

for (let i = 1; i <= TABLE_COUNT; i++) {
  state.tables[i] = {
    items: [],
  };
}

async function loadState() {
  // Use localStorage as the single source of truth for state
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      state = {
        ...state,
        ...parsed,
        settings: { ...defaultSettings, ...(parsed.settings || {}) },
      };
    }
  } catch (e) {
    console.error('Failed to load saved state from localStorage', e);
  }
}

async function saveState() {
  // Persist only to localStorage (local-only mode)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state locally', e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadState();

  const tablesContainer = document.getElementById("tablesContainer");
  const currentTableLabel = document.getElementById("currentTableLabel");
  const itemCountDisplay = document.getElementById("itemCountDisplay");
  const subtotalDisplay = document.getElementById("subtotalDisplay");
  const taxRateDisplay = document.getElementById("taxRateDisplay");
  const grandTotalDisplay = document.getElementById("grandTotalDisplay");

  const orderItemsBody = document.getElementById("orderItemsBody");
  const itemNameInput = document.getElementById("itemNameInput");
  const itemPriceInput = document.getElementById("itemPriceInput");
  const itemQtyInput = document.getElementById("itemQtyInput");
  const addItemBtn = document.getElementById("addItemBtn");
  const clearTableBtn = document.getElementById("clearTableBtn");
  const printBillBtn = document.getElementById("printBillBtn");

  const quickMenuContainer = document.getElementById("quickMenuContainer");
  const openPanelsContainer = document.getElementById("openPanels");

  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const resetSettingsBtn = document.getElementById("resetSettingsBtn");
  const hotelNameInput = document.getElementById("hotelNameInput");
  const hotelAddressInput = document.getElementById("hotelAddressInput");
  const taxRateInput = document.getElementById("taxRateInput");
  const qrTextInput = document.getElementById("qrTextInput");

  const hotelNameDisplay = document.getElementById("hotelNameDisplay");
  const hotelAddressDisplay = document.getElementById("hotelAddressDisplay");

  const billHotelName = document.getElementById("billHotelName");
  const billHotelAddress = document.getElementById("billHotelAddress");
  const billTableNumber = document.getElementById("billTableNumber");
  const billDate = document.getElementById("billDate");
  const billItemsBody = document.getElementById("billItemsBody");
  const billSubtotal = document.getElementById("billSubtotal");
  const billTaxRate = document.getElementById("billTaxRate");
  const billTaxAmount = document.getElementById("billTaxAmount");
  const billGrandTotal = document.getElementById("billGrandTotal");
  const billQrCodeContainer = document.getElementById("billQrCode");
  const paymentModal = document.getElementById('paymentModal');
  const closePaymentBtn = document.getElementById('closePaymentBtn');
  const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
  const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');

  let billQr;

  function initQuickMenu() {
    quickMenuContainer.innerHTML = "";
    defaultQuickMenu.forEach((item) => {
      const div = document.createElement("button");
      div.className = "menu-item";
      div.type = "button";
      div.innerHTML = `
        <span class="menu-item-name">${item.name}</span>
        <span class="menu-item-price">₹${item.price.toFixed(2)}</span>
      `;
      div.addEventListener("click", () => {
        addItemToTable(state.currentTable, item.name, item.price, 1, item.category);
      });
      quickMenuContainer.appendChild(div);
    });
  }

  function formatCurrency(value) {
    return Number(value || 0).toFixed(2);
  }

  function getCurrentTable() {
    return state.tables[state.currentTable];
  }

  function renderTables() {
    tablesContainer.innerHTML = "";
    for (let i = 1; i <= TABLE_COUNT; i++) {
      const tableData = state.tables[i];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "table-btn";
      if (i === state.currentTable) btn.classList.add("active");
      if (tableData.items.length > 0) btn.classList.add("has-items");
      btn.innerHTML = `
        T - ${i}
        <span>${tableData.items.length} items</span>
      `;
      btn.addEventListener("click", () => {
        state.currentTable = i;
        renderAll();
      });
      // dblclick to open a small panel for simultaneous editing
      btn.addEventListener("dblclick", () => {
        openPanel(i);
      });
      tablesContainer.appendChild(btn);
    }
  }

  // currently opened panel table numbers
  let openPanels = [];

  function openPanel(tableNumber) {
    if (!openPanels.includes(tableNumber)) {
      openPanels.push(tableNumber);
      renderOpenPanels();
    }
  }

  function closePanel(tableNumber) {
    openPanels = openPanels.filter((t) => t !== tableNumber);
    renderOpenPanels();
  }

  function renderOpenPanels() {
    if (!openPanelsContainer) return;
    openPanelsContainer.innerHTML = "";
    openPanels.forEach((tableNumber) => {
      const table = state.tables[tableNumber];
      const card = document.createElement("div");
      card.className = "open-panel-card";

      const header = document.createElement("div");
      header.className = "open-panel-header";
      header.innerHTML = `<strong>Table ${tableNumber}</strong>`;
      const closeBtn = document.createElement("button");
      closeBtn.className = "icon-btn";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Close panel";
      closeBtn.addEventListener("click", () => closePanel(tableNumber));
      header.appendChild(closeBtn);
      card.appendChild(header);

      const itemsDiv = document.createElement("div");
      itemsDiv.className = "open-panel-items";
      if (!table.items || table.items.length === 0) {
        itemsDiv.innerHTML = `<div class="muted">No items</div>`;
      } else {
        table.items.forEach((it, idx) => {
          const row = document.createElement("div");
          row.innerHTML = `<span>${idx + 1}. ${it.name} x${it.qty}</span><span>₹${formatCurrency(
            it.price * it.qty
          )}</span>`;
          const rm = document.createElement("button");
          rm.className = "btn small danger-btn";
          rm.textContent = "Del";
          rm.addEventListener("click", () => {
            state.tables[tableNumber].items.splice(idx, 1);
            saveState();
            renderAll();
            renderOpenPanels();
          });
          const wrapper = document.createElement("div");
          wrapper.style.display = "flex";
          wrapper.style.justifyContent = "space-between";
          wrapper.appendChild(row);
          wrapper.appendChild(rm);
          itemsDiv.appendChild(wrapper);
        });
      }
      card.appendChild(itemsDiv);

      // quick add controls
      const controls = document.createElement("div");
      controls.className = "open-panel-controls";
      const nameInput = document.createElement("input");
      nameInput.placeholder = "Item name";
      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.placeholder = "Price";
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.placeholder = "Qty";
      qtyInput.value = 1;
      controls.appendChild(nameInput);
      controls.appendChild(priceInput);
      controls.appendChild(qtyInput);
      card.appendChild(controls);

      const actions = document.createElement("div");
      actions.className = "open-panel-actions";
      const addBtn = document.createElement("button");
      addBtn.className = "btn primary-btn";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", () => {
        const nm = nameInput.value.trim();
        const pr = parseFloat(priceInput.value);
        const q = parseInt(qtyInput.value, 10) || 1;
        if (!nm || isNaN(pr)) return;
        addItemToTable(tableNumber, nm, pr, q);
        renderOpenPanels();
        nameInput.value = "";
        priceInput.value = "";
        qtyInput.value = 1;
      });

      const printBtn = document.createElement("button");
      printBtn.className = "btn ghost-btn";
      printBtn.textContent = "Print";
      printBtn.addEventListener("click", () => {
        if ((state.tables[tableNumber].items || []).length === 0) {
          alert("No items to print for this table.");
          return;
        }
        // prompt payment first
        openPaymentModal((method) => {
          state._lastPaymentMethod = method;
          const inv2 = prepareBillData(tableNumber);
          recordSale(tableNumber, inv2, method);
          window.print();
          askToClearTable(tableNumber);
        });
      });

      actions.appendChild(printBtn);
      actions.appendChild(addBtn);
      card.appendChild(actions);

      openPanelsContainer.appendChild(card);
    });
  }

  function renderCurrentOrder() {
    const table = getCurrentTable();
    currentTableLabel.textContent = state.currentTable;

    orderItemsBody.innerHTML = "";

    let subtotal = 0;
    table.items.forEach((item, index) => {
      const row = document.createElement("tr");
      const total = item.price * item.qty;
      subtotal += total;
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₹${formatCurrency(item.price)}</td>
        <td>₹${formatCurrency(total)}</td>
        <td><button class="btn small ghost-btn remove-btn" data-index="${index}">X</button></td>
      `;
      orderItemsBody.appendChild(row);
    });

    orderItemsBody.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-index"));
        table.items.splice(idx, 1);
        saveState();
        renderAll();
      });
    });

    const taxRate = state.settings.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;

    itemCountDisplay.textContent = table.items.length;
    subtotalDisplay.textContent = formatCurrency(subtotal);
    taxRateDisplay.textContent = taxRate;
    grandTotalDisplay.textContent = formatCurrency(grandTotal);
  }

  function renderHeader() {
    hotelNameDisplay.textContent = state.settings.hotelName || defaultSettings.hotelName;
    hotelAddressDisplay.textContent = state.settings.hotelAddress || defaultSettings.hotelAddress;
  }

  function renderAll() {
    renderHeader();
    renderTables();
    renderCurrentOrder();
    // keep open panels in sync with current state
    if (typeof renderOpenPanels === 'function') renderOpenPanels();
  }

  function addItemToCurrentTable(name, price, qty) {
    addItemToTable(state.currentTable, name, price, qty);
  }

  function addItemToTable(tableNumber, name, price, qty, category) {
    if (!name || isNaN(price) || isNaN(qty) || qty <= 0) return;
    const table = state.tables[tableNumber];
    const nm = name.trim();
    const pr = Number(price);
    const q = Number(qty);
    const cat = category || 'Uncategorized';

    // merge if same item name (case-insensitive) and same price
    const existing = table.items.find(
      (it) => it.name.trim().toLowerCase() === nm.toLowerCase() && Number(it.price) === pr
    );
    if (existing) {
      existing.qty = Number(existing.qty) + q;
    } else {
      table.items.push({ name: nm, price: pr, qty: q, category: cat });
    }
    saveState();
    renderAll();
  }

  // Record a completed sale (called when printing a bill)
  function recordSale(tableNumber, invoiceId, paymentMethod, paymentRef) {
    const table = state.tables[tableNumber];
    if (!table) return;
    const now = new Date();
    const subtotal = table.items.reduce((s, it) => s + it.price * it.qty, 0);
    const taxRate = state.settings.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;
    const sale = {
      invoiceId,
      date: now.toISOString(),
      table: tableNumber,
      items: JSON.parse(JSON.stringify(table.items || [])),
      subtotal,
      taxRate,
      taxAmount,
      grandTotal,
      paymentMethod: paymentMethod || null,
      paymentRef: paymentRef || null,
    };
    state.sales = state.sales || [];
    state.sales.push(sale);
    saveState();
  }

  // Ask cashier whether to clear the table after printing
  function askToClearTable(tableNumber) {
    // delay slightly so the print dialog finishes in most browsers
    setTimeout(() => {
      const confirmClear = window.confirm(`If bill is printed then should i unreserve table and clear all items for Table ${tableNumber}?`);
      if (!confirmClear) return;
      if (state.tables && state.tables[tableNumber]) {
        state.tables[tableNumber].items = [];
        saveState();
        renderAll();
        // if an open panel exists for this table, remove it
        closePanel(tableNumber);
      }
    }, 300);
  }

  // Payment modal helpers
  function openPaymentModal(cb) {
    if (!paymentModal) { cb('Cash'); return; }
    paymentModal.classList.remove('hidden');
    // set default radio
    const radios = paymentModal.querySelectorAll('input[name="paymentMethod"]');
    radios.forEach(r => r.checked = r.value === 'Cash');

    function cleanup() {
      paymentModal.classList.add('hidden');
      closePaymentBtn.removeEventListener('click', onClose);
      cancelPaymentBtn.removeEventListener('click', onClose);
      confirmPaymentBtn.removeEventListener('click', onConfirm);
    }

    function onClose() {
      cleanup();
    }

    function onConfirm() {
      const sel = paymentModal.querySelector('input[name="paymentMethod"]:checked');
      const method = sel ? sel.value : 'Cash';
      cleanup();
      if (typeof cb === 'function') cb(method);
    }

    closePaymentBtn.addEventListener('click', onClose);
    cancelPaymentBtn.addEventListener('click', onClose);
    confirmPaymentBtn.addEventListener('click', onConfirm);
  }

  // Aggregate sales by category and item (for a given set of sales)
  function aggregateSalesByCategory(sales) {
    const catMap = {}; // category -> itemName -> { qty, revenue }
    (sales || []).forEach((s) => {
      (s.items || []).forEach((it) => {
        const cat = it.category || 'Uncategorized';
        catMap[cat] = catMap[cat] || {};
        const key = it.name;
        if (!catMap[cat][key]) catMap[cat][key] = { qty: 0, revenue: 0, price: it.price };
        catMap[cat][key].qty += Number(it.qty || 0);
        catMap[cat][key].revenue += Number(it.price || 0) * Number(it.qty || 0);
      });
    });
    return catMap;
  }

  addItemBtn.addEventListener("click", () => {
    const name = itemNameInput.value.trim();
    const price = parseFloat(itemPriceInput.value);
    const qty = parseInt(itemQtyInput.value, 10) || 1;

    if (!name) {
      itemNameInput.focus();
      return;
    }
    if (isNaN(price) || price < 0) {
      itemPriceInput.focus();
      return;
    }

    addItemToCurrentTable(name, price, qty);
    itemNameInput.value = "";
    itemPriceInput.value = "";
    itemQtyInput.value = "1";
    itemNameInput.focus();
  });

  [itemNameInput, itemPriceInput, itemQtyInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addItemBtn.click();
      }
    });
  });

  clearTableBtn.addEventListener("click", () => {
    const table = getCurrentTable();
    if (table.items.length === 0) return;
    const confirmClear = window.confirm(
      `Clear all items for Table ${state.currentTable}?`
    );
    if (!confirmClear) return;
    table.items = [];
    saveState();
    renderAll();
  });

  function openSettings() {
    hotelNameInput.value = state.settings.hotelName || "";
    hotelAddressInput.value = state.settings.hotelAddress || "";
    taxRateInput.value = state.settings.taxRate || 0;
    qrTextInput.value = state.settings.qrText || "";
    settingsModal.classList.remove("hidden");
  }

  function closeSettings() {
    settingsModal.classList.add("hidden");
  }

  openSettingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal.querySelector(".modal-backdrop")) {
      closeSettings();
    }
  });

  saveSettingsBtn.addEventListener("click", () => {
    state.settings.hotelName = hotelNameInput.value.trim() || defaultSettings.hotelName;
    state.settings.hotelAddress =
      hotelAddressInput.value.trim() || defaultSettings.hotelAddress;
    state.settings.taxRate = parseFloat(taxRateInput.value) || 0;
    state.settings.qrText = qrTextInput.value.trim() || defaultSettings.qrText;
    saveState();
    renderAll();
    closeSettings();
  });

  resetSettingsBtn.addEventListener("click", () => {
    const confirmReset = window.confirm("Reset hotel details to defaults?");
    if (!confirmReset) return;
    state.settings = { ...defaultSettings };
    saveState();
    renderAll();
    closeSettings();
  });

  function prepareBillData(tableNumber) {
    const table = tableNumber ? state.tables[tableNumber] : getCurrentTable();
    const now = new Date();
    const subtotal = table.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
    const taxRate = state.settings.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;

    billHotelName.textContent = state.settings.hotelName || defaultSettings.hotelName;
    billHotelAddress.textContent = state.settings.hotelAddress || defaultSettings.hotelAddress;
    billTableNumber.textContent = tableNumber || state.currentTable;
    billDate.textContent = now.toLocaleString();

    // generate invoice id in form YYYYMMDD + order number (zero-padded)
    const pad = (n, width = 4) => String(n).padStart(width, '0');
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayKey = `${y}${m}${d}`;

    let seq = 1;
    if (state.lastInvoice && state.lastInvoice.date === todayKey) {
      seq = (Number(state.lastInvoice.seq) || 0) + 1;
    }
    state.lastInvoice = { date: todayKey, seq };
    // persist invoice sequence
    saveState();

    const invoiceId = `${todayKey}${pad(seq, 4)}`;
    const billInvoiceEl = document.getElementById('billInvoice');
    if (billInvoiceEl) billInvoiceEl.textContent = invoiceId;

    // set logo if provided (settings could include a logo URL in future)
    const logoImg = document.getElementById('billLogoImg');
    if (logoImg) {
      if (state.settings.logo && state.settings.logo.length) {
        logoImg.src = state.settings.logo;
        logoImg.style.display = '';
      } else {
        logoImg.style.display = 'none';
      }
    }

    billItemsBody.innerHTML = "";
    table.items.forEach((item, idx) => {
      const row = document.createElement("tr");
      const total = item.price * item.qty;
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(total)}</td>
      `;
      billItemsBody.appendChild(row);
    });

    billSubtotal.textContent = formatCurrency(subtotal);
    billTaxRate.textContent = taxRate;
    billTaxAmount.textContent = formatCurrency(taxAmount);
    billGrandTotal.textContent = formatCurrency(grandTotal);

    if (!billQr) {
      billQr = new QRCode(billQrCodeContainer, {
        text: state.settings.qrText || defaultSettings.qrText,
        width: 80,
        height: 80,
      });
    } else {
      billQr.clear();
      billQr.makeCode(state.settings.qrText || defaultSettings.qrText);
    }
    // set payment display placeholder (may be updated by caller)
    const billPaymentMethodEl = document.getElementById('billPaymentMethod');
    if (billPaymentMethodEl) billPaymentMethodEl.textContent = state._lastPaymentMethod || '-';

    // return the invoice id so caller can record the sale
    return invoiceId;
  }

  printBillBtn.addEventListener("click", () => {
    const table = getCurrentTable();
    if (table.items.length === 0) {
      alert("No items on this table to print.");
      return;
    }
    // open payment modal first
    openPaymentModal((method) => {
      state._lastPaymentMethod = method;
      const inv = prepareBillData();
      recordSale(state.currentTable, inv, method);
      window.print();
      askToClearTable(state.currentTable);
    });
  });

  // Reports UI bindings and behavior
  const openReportsBtn = document.getElementById('openReportsBtn');
  const reportsPanel = document.getElementById('reportsPanel');
  const closeReportsBtn = document.getElementById('closeReportsBtn');
  const reportFrom = document.getElementById('reportFrom');
  const reportTo = document.getElementById('reportTo');
  const filterReportsBtn = document.getElementById('filterReportsBtn');
  const exportReportsBtn = document.getElementById('exportReportsBtn');
  const reportsList = document.getElementById('reportsList');

  function openReports() {
    if (!reportsPanel) return;
    reportsPanel.classList.remove('hidden');
    renderReports();
  }

  function closeReports() {
    if (!reportsPanel) return;
    reportsPanel.classList.add('hidden');
  }

  function renderReports() {
    if (!reportsList) return;
    const from = reportFrom && reportFrom.value ? new Date(reportFrom.value) : null;
    const to = reportTo && reportTo.value ? new Date(reportTo.value + 'T23:59:59') : null;
    const list = (state.sales || []).slice().reverse();
    reportsList.innerHTML = '';
    if (list.length === 0) {
      reportsList.innerHTML = '<div class="muted">No sales recorded yet.</div>';
      return;
    }

    // filter sales by date range first
    const filteredSales = list.filter((s) => {
      const sd = new Date(s.date);
      if (from && sd < from) return false;
      if (to && sd > to) return false;
      return true;
    });

    // aggregated category summary as a compact table
    const agg = aggregateSalesByCategory(filteredSales);
    const summaryTable = document.createElement('table');
    summaryTable.className = 'reports-summary';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Category</th><th>Item</th><th style="text-align:center">Qty</th><th>Revenue</th></tr>';
    summaryTable.appendChild(thead);
    const tbody = document.createElement('tbody');
    Object.keys(agg).sort().forEach((cat) => {
      const items = agg[cat];
      // category header row
      const catRow = document.createElement('tr');
      catRow.className = 'category-row';
      catRow.innerHTML = `<td>${cat}</td><td></td><td></td><td class="amount">` +
        `₹${formatCurrency(Object.values(items).reduce((s, x) => s + x.revenue, 0))}</td>`;
      tbody.appendChild(catRow);
      Object.keys(items).sort().forEach((itemName) => {
        const it = items[itemName];
        const r = document.createElement('tr');
        r.innerHTML = `<td></td><td>${itemName}</td><td style="text-align:center">${it.qty}</td><td class="amount">₹${formatCurrency(it.revenue)}</td>`;
        tbody.appendChild(r);
      });
    });
    summaryTable.appendChild(tbody);
    // clear previous and add summary
    reportsList.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = 'Category Summary';
    title.style.margin = '0 0 6px 0';
    reportsList.appendChild(title);
    reportsList.appendChild(summaryTable);

    // then show individual sales entries below
    filteredSales.forEach((s) => {
      const saleDate = new Date(s.date);
      // (already filtered)
      const item = document.createElement('div');
      item.className = 'reports-item';
      const left = document.createElement('div');
      left.className = 'left';
      left.innerHTML = `<div><strong>${s.invoiceId}</strong> <small>Table ${s.table}</small></div><small>${saleDate.toLocaleString()}</small>`;
      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.flexDirection = 'column';
      right.style.alignItems = 'flex-end';
      right.innerHTML = `<div class="amount">₹${formatCurrency(s.grandTotal)}</div>`;
      const detailsBtn = document.createElement('button');
      detailsBtn.className = 'btn ghost-btn small';
      detailsBtn.textContent = 'Details';
      detailsBtn.addEventListener('click', () => {
        const details = document.createElement('div');
        details.style.marginTop = '6px';
        details.innerHTML = `<table style="width:100%;font-size:0.9rem;border-collapse:collapse;"><thead><tr><th>#</th><th>Item</th><th>Qty</th><th style=\"text-align:right\">Total</th></tr></thead><tbody>${s.items
          .map((it, idx) => `<tr><td style=\"width:6%\">${idx + 1}</td><td>${it.name}</td><td style=\"text-align:center\">${it.qty}</td><td style=\"text-align:right\">₹${formatCurrency(it.price * it.qty)}</td></tr>`)
          .join('')}</tbody></table>`;
        // toggle
        if (detailsBtn._shown) {
          detailsBtn._shown = false;
          if (details.parentNode) details.parentNode.removeChild(details);
          return;
        }
        detailsBtn._shown = true;
        item.appendChild(details);
      });
      right.appendChild(detailsBtn);
      item.appendChild(left);
      item.appendChild(right);
      reportsList.appendChild(item);
    });
  }

  function exportReports() {
    const data = JSON.stringify(state.sales || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (openReportsBtn) openReportsBtn.addEventListener('click', openReports);
  if (closeReportsBtn) closeReportsBtn.addEventListener('click', closeReports);
  if (filterReportsBtn) filterReportsBtn.addEventListener('click', renderReports);
  if (exportReportsBtn) exportReportsBtn.addEventListener('click', exportReports);

  initQuickMenu();
  renderAll();
});


