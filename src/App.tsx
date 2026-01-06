import React, { useMemo, useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";

// --- Global Types ---
declare global {
  interface Window {
    PaystackPop: any;
  }
}

// --- Types ---
type Transaction = {
  id: string;
  amount: number;
  timestamp: string;
  type: "deposit" | "withdrawal";
  status: "success" | "pending" | "failed";
  label: string;
};

// --- Helpers ---
const MOCK_HISTORY: Transaction[] = [
  { id: "TX1", amount: 450000, timestamp: "2023-08-01T10:00:00Z", type: "deposit", status: "success", label: "Initial Deposit" },
  { id: "TX2", amount: -15000, timestamp: "2023-08-02T14:30:00Z", type: "withdrawal", status: "success", label: "Domain Renewal" },
  { id: "TX3", amount: 120000, timestamp: "2023-08-05T09:15:00Z", type: "deposit", status: "success", label: "Sales Revenue" },
  { id: "TX4", amount: -25000, timestamp: "2023-08-10T11:20:00Z", type: "withdrawal", status: "success", label: "Hosting Fee" },
  { id: "TX5", amount: 750000, timestamp: "2023-08-15T16:45:00Z", type: "deposit", status: "success", label: "Product Launch" },
];

const loadInitialTransactions = (): Transaction[] => {
  const stored = localStorage.getItem("transactions");
  if (!stored) return MOCK_HISTORY;
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : MOCK_HISTORY;
  } catch {
    return MOCK_HISTORY;
  }
};

const saveTransactions = (txs: Transaction[]) => {
  localStorage.setItem("transactions", JSON.stringify(txs));
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="install-banner">
      <div className="install-content">
        <h3>Install SabiOps</h3>
        <p>Access your dashboard faster from your home screen.</p>
      </div>
      <button className="install-button" onClick={handleInstall}>
        Install
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadInitialTransactions());
  const [amountInput, setAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const balance = useMemo(() => {
    return transactions.reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions]);

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
        const newTx: Transaction = { 
          id: res.reference, 
          amount: numericAmount, 
          timestamp: new Date().toISOString(),
          type: "deposit",
          status: "success",
          label: "Wallet Funding"
        };
        const updatedTxs = [newTx, ...transactions];
        setTransactions(updatedTxs);
        saveTransactions(updatedTxs);
        setAmountInput("");
        setIsProcessing(false);
        // Navigate back to dashboard instead of history
        navigate("/");
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
        <div className="header-actions">
          <button className="notification-bell">
            <span>🔔</span>
            <div className="bell-badge" />
          </button>
        </div>
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
                    <span className="balance-label">Current Balance</span>
                    <span className="balance-currency">NGN</span>
                  </div>
                  <p className="balance-amount">{formatCurrency(balance)}</p>
                  <div className="stat-trend up" style={{ color: "#bbf7d0" }}>↑ Safe to spend</div>
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
                  <div className="section-header">
                    <h2 className="section-title">Transaction History</h2>
                    <span className="balance-currency">Total: {formatCurrency(balance)}</span>
                  </div>
                  <div className="history-list">
                    {transactions.map(tx => (
                      <div key={tx.id} className="product-item">
                        <div className={`product-img ${tx.type}`} style={{ 
                          background: tx.type === 'deposit' ? '#f0fdf4' : '#fff1f2',
                          fontSize: '1.1rem'
                        }}>
                          {tx.type === 'deposit' ? '📈' : '📉'}
                        </div>
                        <div className="product-info">
                          <p className="product-name">{tx.label}</p>
                          <p className="product-meta">{new Date(tx.timestamp).toLocaleDateString()} • {tx.status}</p>
                        </div>
                        <p className="product-price" style={{ color: tx.type === 'deposit' ? '#10b981' : '#ef4444' }}>
                          {tx.type === 'deposit' ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
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
