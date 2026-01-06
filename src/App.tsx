import React, { useMemo, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";

type Transaction = {
  id: string;
  amount: number;
  timestamp: string;
};

type LinePoint = {
  x: string;
  y: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value);
};

const loadInitialBalance = () => {
  const stored = localStorage.getItem("balance");
  if (!stored) {
    return 0;
  }
  const parsed = Number(stored);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
};

const loadInitialTransactions = (): Transaction[] => {
  const stored = localStorage.getItem("transactions");
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored) as Transaction[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

const saveBalance = (value: number) => {
  localStorage.setItem("balance", String(value));
};

const saveTransactions = (items: Transaction[]) => {
  localStorage.setItem("transactions", JSON.stringify(items));
};

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
      const current = dayMap.get(key) ?? 0;
      dayMap.set(key, current + tx.amount);
    }
  });
  let cumulative = 0;
  const result: LinePoint[] = [];
  Array.from(dayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([key, value]) => {
      cumulative += value;
      const label = new Date(key).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric"
      });
      result.push({ x: label, y: cumulative });
    });
  return result;
};

type LogoProps = {
  size?: number;
};

const SabiOpsLogo: React.FC<LogoProps> = ({ size = 28 }) => {
  return (
    <div className="logo-root" style={{ height: size }}>
      <img 
        src="/image.png" 
        alt="SabiOps" 
        className="sabiops-logo" 
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '4px' }} 
      />
      <span className="logo-text">SabiOps</span>
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

  const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;

  const handleSubmitDeposit = () => {
    const numericAmount = Number(amountInput);
    if (!numericAmount || numericAmount <= 0) {
      alert("Enter a valid deposit amount.");
      return;
    }
    if (!paystackPublicKey) {
      alert("Paystack public key is not configured. Add VITE_PAYSTACK_PUBLIC_KEY to your .env and restart the app.");
      return;
    }
    if (!window.PaystackPop) {
      alert("Unable to load Paystack at the moment. Check your connection.");
      return;
    }
    setIsProcessing(true);
    const handler = window.PaystackPop.setup({
      key: paystackPublicKey,
      email: "caleb@gmail.com",
      amount: numericAmount * 100,
      currency: "NGN",
      ref: `REV-${Date.now()}`,
      metadata: {
        source: "SabiOps"
      },
      callback: response => {
        const newBalance = balance + numericAmount;
        const newTransaction: Transaction = {
          id: response.reference,
          amount: numericAmount,
          timestamp: new Date().toISOString()
        };
        const updatedTransactions = [newTransaction, ...transactions];
        setBalance(newBalance);
        setTransactions(updatedTransactions);
        saveBalance(newBalance);
        saveTransactions(updatedTransactions);
        setAmountInput("");
        setIsProcessing(false);
        navigate("/history");
      },
      onClose: () => {
        setIsProcessing(false);
      }
    });
    handler.openIframe();
  };

  const trendOptions: any = useMemo(
    () => ({
      chart: {
        id: "revenue-trend",
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: false
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.9,
          opacityFrom: 0.4,
          opacityTo: 0,
          stops: [0, 40, 100]
        }
      },
      stroke: {
        curve: "smooth",
        width: 3
      },
      xaxis: {
        type: "category",
        labels: {
          style: {
            colors: "#9ca3af"
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => formatCurrency(value),
          style: {
            colors: "#9ca3af"
          }
        }
      },
      grid: {
        borderColor: "rgba(255,255,255,0.05)"
      },
      tooltip: {
        y: {
          formatter: (value: number) => formatCurrency(value)
        }
      },
      colors: ["#6366f1"]
    }),
    [] as const
  );

  const candleOptions: any = useMemo(
    () => ({
      chart: {
        id: "revenue-candles",
        toolbar: {
          show: false
        }
      },
      xaxis: {
        type: "category",
        labels: {
          style: {
            colors: "#9ca3af"
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (value: number) => formatCurrency(value),
          style: {
            colors: "#9ca3af"
          }
        }
      },
      grid: {
        borderColor: "rgba(255,255,255,0.05)"
      },
      tooltip: {
        y: {
          formatter: (value: number) => formatCurrency(value)
        }
      }
    }),
    [] as const
  );

  const trendSeries: any = useMemo(
    () => [
      {
        name: "Revenue",
        data: trendData
      }
    ],
    [trendData]
  );

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <SabiOpsLogo />
          <p className="greeting-label">Hello Caleb</p>
        </div>
        <div className="header-right">
          <span className="header-period">Aug 2023</span>
          <img src="/image.png" alt="Profile" className="profile-image" />
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <div className="page">
                <section className="card balance-card">
                  <div className="balance-label-row">
                    <span className="balance-label">Funds available</span>
                    <span className="balance-currency">NGN</span>
                  </div>
                  <p className="balance-amount">{formatCurrency(balance)}</p>
                  <p className="balance-caption">Overview of your small business cash for campaigns.</p>
                  <div className="balance-pills">
                    <div className="pill">
                      <span className="pill-label">Budgeted</span>
                      <span className="pill-value">{formatCurrency(balance + 350000)}</span>
                    </div>
                    <div className="pill">
                      <span className="pill-label">Spent</span>
                      <span className="pill-value accent-negative">{formatCurrency(140000)}</span>
                    </div>
                    <div className="pill">
                      <span className="pill-label">Left</span>
                      <span className="pill-value accent-positive">
                        {formatCurrency(balance + 210000)}
                      </span>
                    </div>
                  </div>
                </section>
                <section className="card overview-card">
                  <div className="overview-grid">
                    <div className="overview-tile">
                      <p className="overview-label">This month revenue</p>
                      <p className="overview-value">{formatCurrency(balance + 520000)}</p>
                      <p className="overview-tag positive">+18% vs last month</p>
                    </div>
                    <div className="overview-tile">
                      <p className="overview-label">Ad spend</p>
                      <p className="overview-value">{formatCurrency(185000)}</p>
                      <p className="overview-tag neutral">Across all channels</p>
                    </div>
                    <div className="overview-tile">
                      <p className="overview-label">Net balance</p>
                      <p className="overview-value">{formatCurrency(balance + 335000)}</p>
                      <p className="overview-tag">Available to reinvest</p>
                    </div>
                  </div>
                </section>
                <section className="card deposit-card">
                  <h2 className="section-title">Fund campaigns</h2>
                  <label className="field-label" htmlFor="amount">
                    Amount
                  </label>
                  <div className="amount-row">
                    <span className="amount-prefix">₦</span>
                    <input
                      id="amount"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0.00"
                      className="amount-input"
                      value={amountInput}
                      onChange={event => setAmountInput(event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSubmitDeposit}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing with Paystack..." : "Deposit with Paystack"}
                  </button>
                  <p className="helper-text">Balance updates immediately after a successful payment.</p>
                </section>
                <section className="card charts-card">
                  <div className="charts-header">
                    <h2 className="section-title">Revenue trend</h2>
                    <span className="chip">Live</span>
                  </div>
                  <div className="chart-wrapper">
                    <Chart
                      options={trendOptions}
                      series={trendSeries}
                      type="area"
                      height={220}
                    />
                  </div>
                </section>
              </div>
            }
          />
          <Route
            path="/history"
            element={
              <div className="page">
                <section className="card history-card">
                  <h2 className="section-title">Deposit history</h2>
                  {transactions.length === 0 ? (
                    <p className="empty-state">No deposits yet. Fund your first campaign.</p>
                  ) : (
                    <ul className="history-list">
                      {transactions.map(tx => {
                        const date = new Date(tx.timestamp);
                        return (
                          <li key={tx.id} className="history-item">
                            <div>
                              <p className="history-amount">{formatCurrency(tx.amount)}</p>
                              <p className="history-date">
                                {date.toLocaleDateString("en-NG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric"
                                })}{" "}
                                •{" "}
                                {date.toLocaleTimeString("en-NG", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                            <span className="history-status">Successful</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            }
          />
        </Routes>
      </main>
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          <span className="nav-dot" />
          <span className="nav-label">Dashboard</span>
        </NavLink>
        <button
          type="button"
          className="nav-fab"
          onClick={() => {
            if (window.deferredPwaPrompt) {
              try {
                window.deferredPwaPrompt.prompt();
              } catch {
              }
            } else {
              navigate("/");
            }
          }}
        >
          +
        </button>
        <NavLink
          to="/history"
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          <span className="nav-dot" />
          <span className="nav-label">History</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default App;
