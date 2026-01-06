import React, { useMemo, useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";

// --- Types ---
type Transaction = {
  id: string;
  amount: number;
  timestamp: string;
};

type LinePoint = {
  x: string;
  y: number;
};

// --- Helpers ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value);
};

const loadInitialBalance = () => {
  const stored = localStorage.getItem("balance");
  return stored ? Number(stored) : 0;
};

const loadInitialTransactions = (): Transaction[] => {
  const stored = localStorage.getItem("transactions");
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveBalance = (value: number) => localStorage.setItem("balance", String(value));
const saveTransactions = (items: Transaction[]) => localStorage.setItem("transactions", JSON.stringify(items));

const generateTrendData = (transactions: Transaction[]): LinePoint[] => {
  const daysBack = 7;
  const today = new Date();
  const dayMap = new Map<string, number>();
  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }
  transactions.forEach(tx => {
    const date = new Date(tx.timestamp);
    const key = date.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) || 0) + tx.amount);
    }
  });
  let cumulative = 0;
  const result: LinePoint[] = [];
  Array.from(dayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([key, value]) => {
      cumulative += value;
      const label = new Date(key).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
      result.push({ x: label, y: cumulative });
    });
  return result;
};

// --- Components ---
const SabiOpsLogo: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <div className="logo-root">
      <div className="logo-mark" style={{ width: size, height: size }}>
        <img src="/image.png" alt="SabiOps" className="sabiops-logo" />
      </div>
      <span className="logo-text">SabiOps</span>
    </div>
  );
};

const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="install-banner">
      <div className="install-content">
        <h3>Install SabiOps</h3>
        <p>Access your dashboard faster</p>
      </div>
      <button className="install-button" onClick={handleInstall}>
        Install
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(() => loadInitialBalance());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadInitialTransactions());
  const [amountInput, setAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const trendData = useMemo(() => generateTrendData(transactions), [transactions]);
  const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const handleSubmitDeposit = () => {
    const numericAmount = Number(amountInput);
    if (!numericAmount || numericAmount <= 0) return alert("Enter a valid amount.");
    if (!paystackPublicKey) return alert("Paystack key missing.");
    if (!window.PaystackPop) return alert("Paystack not loaded.");

    setIsProcessing(true);
    const handler = window.PaystackPop.setup({
      key: paystackPublicKey,
      email: "caleb@gmail.com",
      amount: numericAmount * 100,
      currency: "NGN",
      callback: (res: any) => {
        const newBalance = balance + numericAmount;
        const newTx = { id: res.reference, amount: numericAmount, timestamp: new Date().toISOString() };
        const updatedTxs = [newTx, ...transactions];
        setBalance(newBalance);
        setTransactions(updatedTxs);
        saveBalance(newBalance);
        saveTransactions(updatedTxs);
        setAmountInput("");
        setIsProcessing(false);
        navigate("/history");
      },
      onClose: () => setIsProcessing(false)
    });
    handler.openIframe();
  };

  const chartOptions: any = {
    chart: { toolbar: { show: false }, zoom: { enabled: false }, sparkline: { enabled: false } },
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
    xaxis: { labels: { style: { colors: "#9ca3af" } } },
    yaxis: { labels: { show: false } },
    grid: { show: false },
    colors: ["#6366f1"],
    tooltip: { theme: "light" }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <SabiOpsLogo />
          <p className="greeting-label">Welcome back, Caleb 👋</p>
        </div>
        <img src="/image.png" alt="Profile" className="profile-image" />
      </header>

      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <div className="page">
                <InstallBanner />

                <section className="card balance-card">
                  <div className="balance-label-row">
                    <span className="balance-label">Total Revenue</span>
                    <span className="balance-currency">NGN</span>
                  </div>
                  <p className="balance-amount">{formatCurrency(balance + 1250000)}</p>
                  <div className="stat-trend up" style={{ color: "#bbf7d0" }}>↑ 15% from last week</div>
                </section>

                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#eef2ff", color: "#6366f1" }}>👥</div>
                    <p className="stat-label">Total Customers</p>
                    <p className="stat-value">32,502</p>
                    <p className="stat-trend down">↓ 2.1%</p>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ background: "#fff7ed", color: "#f97316" }}>🛒</div>
                    <p className="stat-label">Total Orders</p>
                    <p className="stat-value">40,284</p>
                    <p className="stat-trend up">↑ 8.2%</p>
                  </div>
                </div>

                <section className="card charts-card">
                  <div className="section-header">
                    <h2 className="section-title">Sales Overview</h2>
                    <span className="view-all">Monthly ▾</span>
                  </div>
                  <Chart options={chartOptions} series={[{ name: "Sales", data: [30, 40, 35, 50, 49, 60, 70, 91] }]} type="area" height={180} />
                </section>

                <section className="card">
                  <div className="section-header">
                    <h2 className="section-title">Frequently Ordered</h2>
                    <span className="view-all">View All</span>
                  </div>
                  <div className="product-item">
                    <div className="product-img" style={{ background: "#ffe4e6" }}>🍞</div>
                    <div className="product-info">
                      <p className="product-name">Baked Bread</p>
                      <p className="product-meta">50 Orders this week</p>
                    </div>
                    <p className="product-price">₦2,500</p>
                  </div>
                  <div className="product-item">
                    <div className="product-img" style={{ background: "#f0fdf4" }}>🍚</div>
                    <div className="product-info">
                      <p className="product-name">Fried Rice</p>
                      <p className="product-meta">42 Orders this week</p>
                    </div>
                    <p className="product-price">₦3,800</p>
                  </div>
                </section>

                <section className="card deposit-card">
                  <h2 className="section-title">Fund Campaigns</h2>
                  <div className="amount-row">
                    <span className="amount-prefix">₦</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="amount-input"
                      value={amountInput}
                      onChange={e => setAmountInput(e.target.value)}
                    />
                  </div>
                  <button className="primary-button" onClick={handleSubmitDeposit} disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Add Funds"}
                  </button>
                </section>

                <div style={{ height: 20 }}></div>
              </div>
            }
          />
          <Route
            path="/history"
            element={
              <div className="page">
                <section className="card">
                  <h2 className="section-title">Transactions</h2>
                  {transactions.length === 0 ? (
                    <p className="empty-state">No history yet.</p>
                  ) : (
                    <div className="history-list">
                      {transactions.map(tx => (
                        <div key={tx.id} className="product-item">
                          <div className="product-img">💰</div>
                          <div className="product-info">
                            <p className="product-name">Deposit</p>
                            <p className="product-meta">{new Date(tx.timestamp).toLocaleDateString()}</p>
                          </div>
                          <p className="product-price">{formatCurrency(tx.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            }
          />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className="nav-link">
          <span style={{ fontSize: "1.2rem" }}>🏠</span>
          <span className="nav-label">Home</span>
        </NavLink>
        <NavLink to="/history" className="nav-link">
          <span style={{ fontSize: "1.2rem" }}>📊</span>
          <span className="nav-label">Reports</span>
        </NavLink>
        <button className="nav-fab" onClick={() => navigate("/")}>+</button>
        <div className="nav-link">
          <span style={{ fontSize: "1.2rem" }}>🎯</span>
          <span className="nav-label">Ads</span>
        </div>
        <div className="nav-link">
          <span style={{ fontSize: "1.2rem" }}>⚙️</span>
          <span className="nav-label">Settings</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
