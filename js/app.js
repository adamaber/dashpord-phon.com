// --- STATE & LOCAL STORAGE CORE ---
const Storage = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    },
    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },
    getSettings() {
        try {
            return JSON.parse(localStorage.getItem('settings')) || { storeName: 'موبايل ستور', initialCapital: 0 };
        } catch (e) {
            return { storeName: 'موبايل ستور', initialCapital: 0 };
        }
    },
    saveSettings(settings) {
        localStorage.setItem('settings', JSON.stringify(settings));
    },
    log(type, details) {
        const logs = this.get('transactions');
        logs.unshift({
            id: 'LOG-' + Date.now(),
            type,
            details,
            date: new Date().toLocaleDateString('ar-EG'),
            time: new Date().toLocaleTimeString('ar-EG')
        });
        this.save('transactions', logs);
    }
};

// --- NAVIGATION CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.app-section');
    const pageTitle = document.getElementById('page-title');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            pageTitle.innerText = item.innerText;

            if (window.innerWidth <= 992) {
                sidebar.classList.remove('mobile-open');
            }

            refreshAllData();
        });
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
    });

    initApp();
});

// --- APP INITIALIZATION & REFRESH ---
function initApp() {
    const settings = Storage.getSettings();
    if (document.getElementById('setting-store-name')) {
        document.getElementById('setting-store-name').value = settings.storeName || 'موبايل ستور';
    }
    if (document.getElementById('setting-initial-capital')) {
        document.getElementById('setting-initial-capital').value = settings.initialCapital || 0;
    }

    refreshAllData();
}

function refreshAllData() {
    refreshDashboard();
    refreshInventory();
    refreshSales();
    refreshExchanges();
    refreshProfits();
    refreshTransactions();
}

// --- 1. DASHBOARD CALCULATIONS & RENDER ---
function refreshDashboard() {
    const devices = Storage.get('devices');
    const sales = Storage.get('sales');
    const settings = Storage.getSettings();

    let initialCapital = Number(settings.initialCapital || 0);
    let invValue = 0;
    devices.filter(d => d.status === 'In Stock').forEach(d => {
        invValue += Number(d.purchasePrice) + Number(d.expenses || 0);
    });

    let totalCapitalDisplay = initialCapital > 0 ? initialCapital : invValue;

    let totalSales = 0;
    let totalProfits = 0;
    let monthlyProfits = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    sales.forEach(s => {
        totalSales += Number(s.sellingPrice);
        totalProfits += Number(s.profit);
        const sDate = new Date(s.rawDate || s.date);
        if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
            monthlyProfits += Number(s.profit);
        }
    });

    document.getElementById('stat-inv-value').innerText = totalCapitalDisplay.toLocaleString() + ' ج.م';
    document.getElementById('stat-inv-count').innerText = devices.filter(d => d.status === 'In Stock').length;
    document.getElementById('stat-total-sales').innerText = totalSales.toLocaleString() + ' ج.م';
    document.getElementById('stat-total-profits').innerText = totalProfits.toLocaleString() + ' ج.م';
    document.getElementById('stat-monthly-profits').innerText = monthlyProfits.toLocaleString() + ' ج.م';
    document.getElementById('stat-sold-count').innerText = sales.length;

    const recentDevs = devices.filter(d => d.status === 'In Stock').slice(-5).reverse();
    const devTbody = document.getElementById('dash-recent-devices');
    if (recentDevs.length === 0) {
        devTbody.innerHTML = `<tr><td colspan="4" class="empty-state">لا توجد أجهزة حالياً</td></tr>`;
    } else {
        devTbody.innerHTML = recentDevs.map(d => `
      <tr>
        <td>${d.name}</td>
        <td>${d.purchasePrice} ج.م</td>
        <td>${d.condition}</td>
        <td>${d.date}</td>
      </tr>
    `).join('');
    }

    const recentSales = sales.slice(-5).reverse();
    const salesTbody = document.getElementById('dash-recent-sales');
    if (recentSales.length === 0) {
        salesTbody.innerHTML = `<tr><td colspan="4" class="empty-state">لا توجد مبيعات حتى الآن</td></tr>`;
    } else {
        salesTbody.innerHTML = recentSales.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.sellingPrice} ج.م</td>
        <td class="text-success">+${s.profit} ج.م</td>
        <td>${s.date}</td>
      </tr>
    `).join('');
    }
}

// --- 2. ADD DEVICE FORM ---
document.getElementById('add-device-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newDevice = {
        id: 'DEV-' + Date.now(),
        name: document.getElementById('dev-name').value,
        brand: document.getElementById('dev-brand').value,
        type: document.getElementById('dev-type').value,
        storage: document.getElementById('dev-storage').value,
        ram: document.getElementById('dev-ram').value,
        condition: document.getElementById('dev-condition').value,
        battery: document.getElementById('dev-battery').value || 'N/A',
        purchasePrice: Number(document.getElementById('dev-purchase-price').value),
        expenses: Number(document.getElementById('dev-expenses').value),
        expectedPrice: Number(document.getElementById('dev-expected-price').value),
        source: document.getElementById('dev-source').value,
        notes: document.getElementById('dev-notes').value,
        status: 'In Stock',
        date: new Date().toLocaleDateString('ar-EG')
    };

    const devices = Storage.get('devices');
    devices.push(newDevice);
    Storage.save('devices', devices);
    Storage.log('إضافة جهاز', `${newDevice.name} (${newDevice.brand})`);

    alert('تم إضافة الجهاز بنجاح للمخزن!');
    e.target.reset();
    refreshAllData();
});

// --- 3. INVENTORY & SELLING MODAL ---
function refreshInventory() {
    const devices = Storage.get('devices').filter(d => d.status === 'In Stock');
    const tbody = document.getElementById('inventory-table-body');
    const searchVal = document.getElementById('inventory-search').value.toLowerCase();
    const filterVal = document.getElementById('inventory-filter').value;

    let filtered = devices.filter(d => {
        const matchSearch = d.name.toLowerCase().includes(searchVal) || d.brand.toLowerCase().includes(searchVal) || (d.storage && d.storage.toLowerCase().includes(searchVal));
        const matchFilter = filterVal === 'all' || d.type === filterVal;
        return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">لا توجد أجهزة مطابقة في المخزن</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => {
        const actualCost = Number(d.purchasePrice) + Number(d.expenses || 0);
        return `
      <tr>
        <td>${d.id}</td>
        <td><strong>${d.name}</strong> ${d.storage ? '(' + d.storage + ')' : ''}</td>
        <td>${d.type}</td>
        <td>${actualCost} ج.م</td>
        <td>${d.expectedPrice || 0} ج.م</td>
        <td>${d.condition}</td>
        <td>${d.source}</td>
        <td>
          <button class="btn btn-success" onclick="openSellModal('${d.id}')">بيع</button>
          <button class="btn btn-danger" onclick="deleteDevice('${d.id}')">حذف</button>
        </td>
      </tr>
    `;
    }).join('');
}

document.getElementById('inventory-search').addEventListener('input', refreshInventory);
document.getElementById('inventory-filter').addEventListener('change', refreshInventory);

function deleteDevice(id) {
    if (confirm('هل أنت متأكد من حذف هذا الجهاز تماماً؟')) {
        let devices = Storage.get('devices');
        const dev = devices.find(d => d.id === id);
        devices = devices.filter(d => d.id !== id);
        Storage.save('devices', devices);
        if (dev) Storage.log('حذف جهاز', dev.name);
        refreshAllData();
    }
}

const sellModal = document.getElementById('sell-modal');
function openSellModal(id) {
    const devices = Storage.get('devices');
    const dev = devices.find(d => d.id === id);
    if (!dev) return;

    const actualCost = Number(dev.purchasePrice) + Number(dev.expenses || 0);
    document.getElementById('sell-device-id').value = dev.id;
    document.getElementById('sell-modal-device-info').innerHTML = `الجهاز: <strong>${dev.name}</strong> | التكلفة الفعلية: <strong>${actualCost} ج.م</strong>`;
    document.getElementById('sell-price').value = dev.expectedPrice || '';
    sellModal.classList.add('active');
}

document.getElementById('close-modal').addEventListener('click', () => {
    sellModal.classList.remove('active');
});

document.getElementById('sell-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('sell-device-id').value;
    const sellingPrice = Number(document.getElementById('sell-price').value);
    const payment = document.getElementById('sell-payment').value;
    const client = document.getElementById('sell-client').value || 'عميل نقدي';

    let devices = Storage.get('devices');
    const devIndex = devices.findIndex(d => d.id === id);
    if (devIndex === -1) return;

    const dev = devices[devIndex];
    const actualCost = Number(dev.purchasePrice) + Number(dev.expenses || 0);
    const profit = sellingPrice - actualCost;

    dev.status = 'Sold';
    dev.sellingPrice = sellingPrice;
    dev.profit = profit;
    dev.paymentMethod = payment;
    dev.clientName = client;
    dev.saleDate = new Date().toLocaleDateString('ar-EG');
    dev.rawDate = new Date().toISOString();

    const sales = Storage.get('sales');
    sales.push(dev);

    Storage.save('sales', sales);
    Storage.save('devices', devices);
    Storage.log('بيع جهاز', `${dev.name} بربح ${profit} ج.م`);

    sellModal.classList.remove('active');
    alert(`تم بيع الجهاز بنجاح! صافي الربح: ${profit} ج.م`);
    refreshAllData();
});

// --- 4. SALES SECTION ---
function refreshSales() {
    const sales = Storage.get('sales');
    const tbody = document.getElementById('sales-table-body');

    let totalVal = 0;
    let totalProf = 0;
    sales.forEach(s => {
        totalVal += Number(s.sellingPrice);
        totalProf += Number(s.profit);
    });

    document.getElementById('sales-total-count').innerText = sales.length;
    document.getElementById('sales-total-value').innerText = totalVal.toLocaleString() + ' ج.م';
    document.getElementById('sales-total-profits').innerText = totalProf.toLocaleString() + ' ج.م';

    if (sales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">لا توجد مبيعات مسجلة حتى الآن</td></tr>`;
        return;
    }

    tbody.innerHTML = sales.slice().reverse().map(s => {
        const actualCost = Number(s.purchasePrice) + Number(s.expenses || 0);
        return `
      <tr>
        <td>${s.name}</td>
        <td>${actualCost} ج.م</td>
        <td>${s.sellingPrice} ج.م</td>
        <td class="text-success">+${s.profit} ج.م</td>
        <td>${s.paymentMethod || 'Cash'}</td>
        <td>${s.clientName || '-'}</td>
        <td>${s.saleDate}</td>
      </tr>
    `;
    }).join('');
}

// --- 5. EXCHANGES (TRADE-IN) SECTION ---
document.getElementById('exchange-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const oldName = document.getElementById('ex-old-name').value;
    const oldValue = Number(document.getElementById('ex-old-value').value);
    const newName = document.getElementById('ex-new-name').value;
    const newPrice = Number(document.getElementById('ex-new-price').value);
    const newExpenses = Number(document.getElementById('ex-new-expenses').value);
    const diffType = document.getElementById('ex-diff-type').value;
    const diffAmount = Number(document.getElementById('ex-diff-amount').value);
    const client = document.getElementById('ex-client').value || 'عميل استبدال';

    let actualPurchasePriceForNewDevice = oldValue;
    if (diffType === 'client_pays') {
        actualPurchasePriceForNewDevice = oldValue + diffAmount;
    } else if (diffType === 'store_pays') {
        actualPurchasePriceForNewDevice = oldValue - diffAmount;
    }

    const newDevice = {
        id: 'DEV-' + Date.now(),
        name: newName,
        brand: 'غير محدد',
        type: 'iPhone',
        storage: '',
        ram: '',
        condition: 'مستعمل',
        battery: 'N/A',
        purchasePrice: actualPurchasePriceForNewDevice,
        expenses: newExpenses,
        expectedPrice: newPrice,
        source: 'استبدال',
        notes: `مأخوذ استبدال مقابل: ${oldName} (قيمة القديم: ${oldValue})`,
        status: 'In Stock',
        date: new Date().toLocaleDateString('ar-EG')
    };

    const devices = Storage.get('devices');
    devices.push(newDevice);
    Storage.save('devices', devices);

    const exchanges = Storage.get('exchanges');
    exchanges.push({
        oldName,
        oldValue,
        newName,
        diffSummary: `${diffType === 'client_pays' ? 'العميل دفع ' + diffAmount : diffType === 'store_pays' ? 'دفعنا للعميل ' + diffAmount : 'بدون فرق'}`,
        client,
        date: new Date().toLocaleDateString('ar-EG')
    });
    Storage.save('exchanges', exchanges);
    Storage.log('استبدال جهاز', `استلام ${oldName} مقابل ${newName}`);

    alert('تم تسجيل الاستبدال وإضافة الجهاز الجديد للمخزن بنجاح!');
    e.target.reset();
    refreshAllData();
});

function refreshExchanges() {
    const exchanges = Storage.get('exchanges');
    const tbody = document.getElementById('exchanges-table-body');
    if (exchanges.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">لا توجد عمليات استبدال مسجلة</td></tr>`;
        return;
    }
    tbody.innerHTML = exchanges.slice().reverse().map(ex => `
    <tr>
      <td>${ex.oldName}</td>
      <td>${ex.oldValue} ج.م</td>
      <td>${ex.newName}</td>
      <td>${ex.diffSummary}</td>
      <td>${ex.client}</td>
      <td>${ex.date}</td>
    </tr>
  `).join('');
}

// --- 6. PROFITS & REPORTS ---
function refreshProfits() {
    const sales = Storage.get('sales');
    let totalProf = 0;
    let dayProf = 0;
    let monthProf = 0;
    const todayStr = new Date().toLocaleDateString('ar-EG');
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let maxDev = null;
    let minDev = null;

    sales.forEach(s => {
        const p = Number(s.profit);
        totalProf += p;
        const sDate = new Date(s.rawDate || s.date);
        if (s.date === todayStr) dayProf += p;
        if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) monthProf += p;

        if (!maxDev || p > maxDev.profit) maxDev = s;
        if (!minDev || p < minDev.profit) minDev = s;
    });

    const avgProf = sales.length > 0 ? Math.round(totalProf / sales.length) : 0;

    document.getElementById('rep-total-profit').innerText = totalProf.toLocaleString() + ' ج.م';
    document.getElementById('rep-day-profit').innerText = dayProf.toLocaleString() + ' ج.م';
    document.getElementById('rep-month-profit').innerText = monthProf.toLocaleString() + ' ج.م';
    document.getElementById('rep-avg-profit').innerText = avgProf.toLocaleString() + ' ج.م';

    const topDiv = document.getElementById('top-profitable-device');
    const lowDiv = document.getElementById('lowest-profitable-device');

    topDiv.innerHTML = maxDev ? `<strong>${maxDev.name}</strong> - برح صافي: <span class="text-success">+${maxDev.profit} ج.م</span>` : 'لا توجد بيانات كافية';
    lowDiv.innerHTML = minDev ? `<strong>${minDev.name}</strong> - برح صافي: <span class="text-success">+${minDev.profit} ج.م</span>` : 'لا توجد بيانات كافية';
}

// --- 7. TRANSACTIONS LOG ---
function refreshTransactions() {
    const logs = Storage.get('transactions');
    const tbody = document.getElementById('transactions-table-body');
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">سجل العمليات فارغ تماماً</td></tr>`;
        return;
    }
    tbody.innerHTML = logs.map(l => `
    <tr>
      <td><strong>${l.type}</strong></td>
      <td>${l.details}</td>
      <td>${l.date}</td>
      <td>${l.time}</td>
    </tr>
  `).join('');
}

// --- 8. SETTINGS & CAPITAL SAVING ---
document.getElementById('save-capital-btn').addEventListener('click', () => {
    const capitalVal = Number(document.getElementById('setting-initial-capital').value) || 0;
    const storeNameVal = document.getElementById('setting-store-name').value || 'موبايل ستور';

    const settings = {
        storeName: storeNameVal,
        initialCapital: capitalVal
    };

    Storage.saveSettings(settings);
    Storage.log('تحديث الإعدادات', `تم تحديث رأس المال الأساسي إلى ${capitalVal} ج.م`);
    alert('تم حفظ رأس المال وإعدادات المتجر بنجاح!');
    refreshAllData();
});

document.getElementById('export-btn').addEventListener('click', () => {
    const backup = {
        settings: Storage.getSettings(),
        devices: Storage.get('devices'),
        sales: Storage.get('sales'),
        exchanges: Storage.get('exchanges'),
        transactions: Storage.get('transactions'),
        exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mobile_store_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const data = JSON.parse(event.target.result);
            if (data.settings) Storage.saveSettings(data.settings);
            if (data.devices) Storage.save('devices', data.devices);
            if (data.sales) Storage.save('sales', data.sales);
            if (data.exchanges) Storage.save('exchanges', data.exchanges);
            if (data.transactions) Storage.save('transactions', data.transactions);
            alert('تم استيراد البيانات بنجاح وتحديث النظام!');
            initApp();
        } catch (err) {
            alert('خطأ في ملف الـ JSON المرفق!');
        }
    };
    reader.readAsText(file);
});

document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('تحذير شديد! هل أنت متأكد من حذف وحفر كافة بيانات المتجر نهائياً؟ لا يمكن التراجع عن هذا القرار.')) {
        localStorage.clear();
        alert('تم تصفير النظام بنجاح وأصبح فارغاً تماماً.');
        initApp();
    }
});
