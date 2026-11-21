import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Search,
  ShoppingBag,
  Target,
  Utensils,
  Wallet,
  X,
  Upload,
  CarFront,
  Zap,
  Settings,
  Clapperboard,
  FileText,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import AuthPage from "./AuthPage";

/* ------------------------------------------------------------------ */
/* DATA                                                                */
/* Every number on the dashboard is calculated from this list.         */
/* Change a transaction here and all cards, charts and bars update.    */
/* ------------------------------------------------------------------ */

const MONTHLY_BUDGET = 15000;

const transactions = [
  { id: 1, merchant: "Swiggy", category: "Food", date: "2026-11-17T10:42:00", amount: 560, type: "debit" },
  { id: 2, merchant: "Uber", category: "Travel", date: "2026-11-17T09:15:00", amount: 340, type: "debit" },
  { id: 3, merchant: "Amazon", category: "Shopping", date: "2026-11-16T18:20:00", amount: 1200, type: "debit" },
  { id: 4, merchant: "Amazon refund", category: "Shopping", date: "2026-11-16T20:05:00", amount: 300, type: "credit" },
  { id: 5, merchant: "Netflix", category: "Entertainment", date: "2026-11-15T08:00:00", amount: 649, type: "debit" },
  { id: 6, merchant: "Flipkart refund", category: "Shopping", date: "2026-11-14T12:30:00", amount: 400, type: "credit" },
  { id: 7, merchant: "Zomato", category: "Food", date: "2026-11-13T21:10:00", amount: 780, type: "debit" },
  { id: 8, merchant: "Electricity bill", category: "Bills", date: "2026-11-12T11:00:00", amount: 1450, type: "debit" },
  { id: 9, merchant: "Grocery store", category: "Food", date: "2026-11-10T17:45:00", amount: 2510, type: "debit" },
  { id: 10, merchant: "Flipkart", category: "Shopping", date: "2026-11-08T14:20:00", amount: 1800, type: "debit" },
  { id: 11, merchant: "Ola", category: "Travel", date: "2026-11-06T19:30:00", amount: 1460, type: "debit" },
  { id: 12, merchant: "Mobile recharge", category: "Bills", date: "2026-11-05T10:10:00", amount: 599, type: "debit" },
  { id: 13, merchant: "Movie night", category: "Entertainment", date: "2026-11-03T20:00:00", amount: 1200, type: "debit" },
];

// Colour and icon for each category
const categoryMeta = {
  Food: { color: "#0F766E", icon: Utensils },
  Shopping: { color: "#F59E0B", icon: ShoppingBag },
  Travel: { color: "#6366F1", icon: CarFront },
  Bills: { color: "#0EA5E9", icon: Zap },
  Entertainment: { color: "#EC4899", icon: Clapperboard },
  Others: { color: "#94A3B8", icon: Wallet },
};

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Transactions", icon: CreditCard },
  { label: "Insights", icon: Lightbulb },
  { label: "Savings simulator", icon: Target },
];

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ------------------------------------------------------------------ */
/* HELPER FUNCTIONS                                                    */
/* ------------------------------------------------------------------ */

function money(value) {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

function formatDate(isoString) {
  if (!isoString) return "Date unavailable";

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}


function getCategoryMeta(name) {
  return categoryMeta[name] || categoryMeta.Others;
}

/* ------------------------------------------------------------------ */
/* CALCULATIONS (all derived from the transactions list)               */
/* ------------------------------------------------------------------ */

const totalPayments = transactions
  .filter((t) => t.type === "debit")
  .reduce((sum, t) => sum + t.amount, 0);

const totalRefunds = transactions
  .filter((t) => t.type === "credit")
  .reduce((sum, t) => sum + t.amount, 0);
const netSpend = totalPayments - totalRefunds;
const budgetRemaining = MONTHLY_BUDGET - netSpend;
const budgetUsed = Math.min((netSpend / MONTHLY_BUDGET) * 100, 100);

// Net spend per category = debits minus refunds in that category
const categories = (() => {
  const totals = {};

  transactions.forEach((t) => {
    const sign = t.type === "debit" ? 1 : -1;
    totals[t.category] = (totals[t.category] || 0) + sign * t.amount;
  });

  return Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .map(([name, amount]) => ({
      name,
      amount,
      share: Math.round((amount / netSpend) * 100),
      color: getCategoryMeta(name).color,
      icon: getCategoryMeta(name).icon,
    }))
    .sort((a, b) => b.amount - a.amount);
})();

const topCategory = categories[0];

// Total debits for each day of the week (Mon to Sun)
const weeklySpending = (() => {
  const totals = [0, 0, 0, 0, 0, 0, 0];

  transactions
    .filter((t) => t.type === "debit")
    .forEach((t) => {
      totals[new Date(t.date).getDay()] += t.amount;
    });

  // Show Monday first, Sunday last
  return [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => ({
    day: weekdayNames[dayIndex],
    amount: totals[dayIndex],
  }));
})();

const maxWeekly = Math.max(...weeklySpending.map((d) => d.amount), 1);

// Newest first

/* ------------------------------------------------------------------ */
/* SMS IMPORT HELPERS                                                  */
/* These helpers only collect and preview messages in the browser.     */
/* Actual transaction extraction will be handled by the Python API.   */
/* ------------------------------------------------------------------ */

const DEMO_SMS_MESSAGES = [
  "SBI: Rs.560.00 debited from A/c XX1234 on 17-11-2026 for UPI/SWIGGY. Ref 8241001.",
  "HDFC Bank: Your account is debited by INR 340.00 for UPI payment to UBER on 17-Nov-2026.",
  "Amazon: Rs.300 refund has been credited to your original payment method on 16-Nov-2026.",
  "Alert: Your UPI transaction of Rs.500 to AMAZON was unsuccessful. Amount will be reversed if debited.",
  "Zomato ke liye 250 rupaye kat gaye.",
];

function parseCsvRow(row) {
  const values = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"' && row[index + 1] === '"' && insideQuotes) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function extractSmsMessages(fileText, fileName = "") {
  const cleanText = fileText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const looksLikeCsv =
    fileName.toLowerCase().endsWith(".csv") ||
    /(^|,)(sms_text|message|text|body)(,|$)/i.test(cleanText.split(/\r?\n/, 1)[0]);

  if (!looksLikeCsv) {
    return cleanText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const rows = cleanText
    .split(/\r?\n/)
    .map((line) => parseCsvRow(line))
    .filter((row) => row.some((cell) => cell.trim()));

  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.toLowerCase().trim());
  const messageColumn = headers.findIndex((header) =>
    ["sms_text", "message", "text", "body"].includes(header)
  );

  const dataRows = messageColumn >= 0 ? rows.slice(1) : rows;
  const columnIndex = messageColumn >= 0 ? messageColumn : 0;

  return dataRows
    .map((row) => (row[columnIndex] || "").trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* MAIN APP                                                            */
/* ------------------------------------------------------------------ */

function App() {
  // Supabase authentication
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (mounted) {
        if (error) {
          console.error("Session error:", error.message);
        }

        setSession(data?.session ?? null);
        setAuthLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const [activePage, setActivePage] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [smsInputText, setSmsInputText] = useState("");
  const [previewMessages, setPreviewMessages] = useState([]);
  const [importNotice, setImportNotice] = useState("");
  const [importNoticeType, setImportNoticeType] = useState("success");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [processedTransactions, setProcessedTransactions] = useState([]);
   const [processedSummary, setProcessedSummary] = useState(null);
const [processedCategorySpend, setProcessedCategorySpend] = useState({});
const [processedInsights, setProcessedInsights] = useState(null);
const [isProcessing, setIsProcessing] = useState(false);
const [savingsReduction, setSavingsReduction] = useState(20);

const hasProcessedData = processedSummary !== null;

const dashboardTransactions = hasProcessedData
  ? processedTransactions
  : transactions;
  // Newest first
const sortedTransactions = useMemo(() => {
  return [...dashboardTransactions].sort((a, b) => {
    if (sortOrder === "oldest") {
      return new Date(a.date) - new Date(b.date);
    }

    if (sortOrder === "highest") {
      return Number(b.amount) - Number(a.amount);
    }

    if (sortOrder === "lowest") {
      return Number(a.amount) - Number(b.amount);
    }

    return new Date(b.date) - new Date(a.date);
  });
}, [dashboardTransactions, sortOrder]);

const totalPayments = hasProcessedData
  ? Number(processedSummary.gross_spend || 0)
  : transactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);

const totalRefunds = hasProcessedData
  ? Number(processedSummary.matched_refunds || 0)
  : transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);

const dashboardPayments = totalPayments;

const dashboardRefunds = hasProcessedData
  ? Number(processedSummary.total_refunds_received || 0)
  : totalRefunds;

const netSpend = hasProcessedData
  ? Number(processedSummary.net_spend || 0)
  : totalPayments - totalRefunds;

const budgetRemaining = MONTHLY_BUDGET - netSpend;

const budgetUsed = Math.min(
  Math.max((netSpend / MONTHLY_BUDGET) * 100, 0),
  100
);

  const categories = (() => {
    if (hasProcessedData) {
      return Object.entries(processedCategorySpend)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([name, amount]) => ({
          name,
          amount: Number(amount),
          share:
            netSpend > 0
              ? Math.round((Number(amount) / netSpend) * 100)
              : 0,
          color: getCategoryMeta(name).color,
          icon: getCategoryMeta(name).icon,
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    const totals = {};

    transactions.forEach((t) => {
      const sign = t.type === "debit" ? 1 : -1;
      totals[t.category] = (totals[t.category] || 0) + sign * t.amount;
    });

    return Object.entries(totals)
      .filter(([, amount]) => amount > 0)
      .map(([name, amount]) => ({
        name,
        amount,
        share:
          netSpend > 0 ? Math.round((amount / netSpend) * 100) : 0,
        color: getCategoryMeta(name).color,
        icon: getCategoryMeta(name).icon,
      }))
      .sort((a, b) => b.amount - a.amount);
  })();

  const topCategory = categories[0] || {
    name: "No spending data",
    amount: 0,
    share: 0,
  };

  const weeklySpending = (() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];

    dashboardTransactions
      .filter(
        (t) =>
          t.type === "debit" &&
          t.status !== "failed" &&
          t.status !== "not_a_transaction"
      )
      .forEach((t) => {
        const amount = hasProcessedData
          ? Number(t.netAmount ?? t.amount ?? 0)
          : Number(t.amount || 0);

        totals[new Date(t.date).getDay()] += amount;
      });

    return [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => ({
      day: weekdayNames[dayIndex],
      amount: totals[dayIndex],
    }));
  })();

  const maxWeekly = Math.max(
    ...weeklySpending.map((day) => day.amount),
    1
  );

  

  const filteredTransactions = useMemo(() => {
  const query = searchQuery.toLowerCase().trim();

  return sortedTransactions.filter((t) => {
    const matchesCategory =
      categoryFilter === "All" || t.category === categoryFilter;

    const matchesSearch =
      !query ||
      [t.merchant, t.category]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const transactionStatus =
      t.status || (t.type === "credit" ? "refund" : "success");

    const matchesStatus =
      statusFilter === "All" || transactionStatus === statusFilter;

    return matchesCategory && matchesSearch && matchesStatus;
  });
}, [searchQuery, categoryFilter, statusFilter, sortedTransactions]);

  function showImportNotice(message, type = "success") {
    setImportNotice(message);
    setImportNoticeType(type);
  }

  function loadDemoMessages() {
    setSmsInputText(DEMO_SMS_MESSAGES.join("\n"));
    setPreviewMessages([]);
    setSelectedFileName("");
    showImportNotice(
      `${DEMO_SMS_MESSAGES.length} synthetic demo messages loaded. Select Preview messages to review them.`,
      "success"
    );
  }

  function clearImportForm() {
    setSmsInputText("");
    setPreviewMessages([]);
    setSelectedFileName("");
    showImportNotice("Import form cleared.", "success");
  }

  

function previewSmsMessages() {
  const messages = smsInputText
    .split(/\r?\n/)
    .map((message) => message.trim())
    .filter(Boolean);

  if (messages.length === 0) {
    setPreviewMessages([]);
    showImportNotice(
      "Add at least one SMS message or load the demo messages first.",
      "error"
    );
    return;
  }

  setPreviewMessages(messages);
  showImportNotice(
    `${messages.length} message${messages.length === 1 ? "" : "s"} ready for preview. They have not been analysed or added to your dashboard yet.`,
    "success"
  );
}

async function analyseSmsMessages() {
  const messages = smsInputText
    .split(/\r?\n/)
    .map((message) => message.trim())
    .filter(Boolean);

  if (messages.length === 0) {
    showImportNotice("Please add SMS messages before analysing.", "error");
    return;
  }

  setIsProcessing(true);
  showImportNotice("Analysing transactions. Please wait...", "success");

  try {
    const today = new Date();
    const receivedAt = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    const response = await fetch(
      `${(import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "")}/process-transactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map((sms) => ({
            sms_text: sms,
            received_at: receivedAt,
          })),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }

    const result = await response.json();

    const formattedTransactions = result.transactions.map((transaction) => ({
      id: transaction.message_id,
      merchant: transaction.merchant,
      category: transaction.category,
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.direction,
      status: transaction.status,
      treatment: transaction.treatment,
      netAmount: transaction.net_amount,
      reason: transaction.reason,
      matchedTo: transaction.matched_to,
      matchConfidence: transaction.match_confidence,
      parserSource: transaction.parser_source,
    }));


setProcessedTransactions(formattedTransactions);
setProcessedSummary(result.summary);
setProcessedCategorySpend(result.category_spend || {});
setProcessedInsights(result.insights || null);

    showImportNotice(
      `Successfully analysed ${formattedTransactions.length} transactions.`,
      "success"
    );
  } catch (error) {
    console.error("SMS analysis failed:", error);
    showImportNotice(
      "Could not analyse messages. Check that the PaisaLens backend is running.",
      "error"
    );
  } finally {
    setIsProcessing(false);
  }
}

  async function handleSmsFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSupported = /\.(txt|csv)$/i.test(file.name);
    if (!isSupported) {
      showImportNotice("Please choose a .txt or .csv file.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showImportNotice("The file is larger than 2 MB. Please choose a smaller file.", "error");
      event.target.value = "";
      return;
    }

    try {
      const fileText = await file.text();
      const messages = extractSmsMessages(fileText, file.name);

      if (messages.length === 0) {
        showImportNotice("No messages were found. For CSV files, include an sms_text, message, text or body column.", "error");
        setSmsInputText("");
        setPreviewMessages([]);
        setSelectedFileName(file.name);
        return;
      }

      setSmsInputText(messages.join("\n"));
      setPreviewMessages([]);
      setSelectedFileName(file.name);
      showImportNotice(
        `Loaded ${messages.length} message${messages.length === 1 ? "" : "s"} from ${file.name}. Select Preview messages to review them.`,
        "success"
      );
    } catch (error) {
      showImportNotice("The file could not be read. Please try another TXT or CSV file.", "error");
    }

    event.target.value = "";
  }

  function changePage(page) {
    setActivePage(page);
    setMobileMenuOpen(false);
  }

  if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm font-medium text-teal-700">
        Loading PaisaLens...
      </p>
    </div>
  );
}

if (!session) {
  return <AuthPage />;
}

return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#0F172A]">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-white">
              <Wallet size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PaisaLens</h1>
              <p className="text-xs text-slate-500">Your money, understood.</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main menu
          </p>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.label;

              return (
                <button
                  key={item.label}
                  onClick={() => changePage(item.label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#E8F4F1] text-[#0F766E]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#0F766E]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto space-y-3 border-t border-slate-100 p-4">
          <div className="rounded-xl bg-[#F0F7F5] p-4">
            <div className="mb-2 flex items-center gap-2 text-[#0F766E]">
              <CircleHelp size={18} />
              <span className="text-sm font-semibold">Need help?</span>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              Understand your transactions and make smarter budgeting
              decisions.
            </p>
          </div>

          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="text-xs text-slate-500">PAISALENS / PERSONAL FINANCE</p>
              <p className="text-sm font-semibold sm:text-base">{activePage}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => changePage("Import SMS")}
              className="flex items-center gap-2 rounded-xl bg-[#0F766E] px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59] sm:px-4 sm:text-sm"
            >
              <Upload size={17} />
              <span className="hidden sm:inline">Import SMS</span>
              <span className="sm:hidden">Import</span>
            </button>

            <div className="hidden h-9 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2">
  <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#E8F4F1] text-sm font-bold text-[#0F766E] sm:flex">
    {(session?.user?.email || "P").charAt(0).toUpperCase()}
  </div>

  <span className="hidden max-w-[150px] truncate text-sm font-medium sm:block">
    {session?.user?.email || "Personal account"}
  </span>

  <button
    onClick={async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        alert("Unable to log out: " + error.message);
      }
    }}
    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
  >
    Log out
  </button>
</div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-8">
          {activePage === "Overview" && (
            <>
              {/* Page heading */}
              <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-[#E8F4F1] px-3 py-1 text-xs font-semibold text-[#0F766E]">
                      Your financial overview
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
  {hasProcessedData ? "Imported SMS" : "Demo data"}
</span>
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Your money at a glance
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Understand your spending and stay on top of your budget.
                  </p>
                </div>

                <button className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm sm:self-auto">
                  <CalendarDays size={17} />
                  November 2026
                  <ChevronDown size={15} />
                </button>
              </section>

              {/* Summary cards */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Net spending"
                  amount={money(netSpend)}
                  note="After refunds"
                  icon={Wallet}
                  iconColor="text-[#0F766E]"
                  iconBackground="bg-[#E8F4F1]"
                />
                <SummaryCard
                  title="Total payments"
                  amount={money(dashboardPayments)}
                  note="Successful debits"
                  icon={ArrowUpRight}
                  iconColor="text-blue-600"
                  iconBackground="bg-blue-50"
                />
                <SummaryCard
                  title="Refunds received"
                  amount={money(dashboardRefunds)}
                  note="Total refunds detected"
                  icon={ArrowDownLeft}
                  iconColor="text-green-600"
                  iconBackground="bg-green-50"
                />
                <SummaryCard
                  title={budgetRemaining >= 0 ? "Budget remaining" : "Over budget by"}
                  amount={money(Math.abs(budgetRemaining))}
                  note={`From your ${money(MONTHLY_BUDGET)} budget`}
                  icon={Target}
                  iconColor="text-amber-600"
                  iconBackground="bg-amber-50"
                />
              </section>

              {/* Charts */}
              <section className="grid gap-5 xl:grid-cols-3">
                {/* Weekday spending chart */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold">Spending by day of week</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Total payments for each weekday this month
                      </p>
                    </div>
                    <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                      <CalendarDays size={18} />
                    </button>
                  </div>

                  <div className="mt-8 flex h-48 items-end justify-between gap-2 sm:gap-5">
                    {weeklySpending.map((day) => (
                      <div
                        key={day.day}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                      >
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            title={`${money(day.amount)} spent`}
                            className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-[#0F766E] to-[#2DD4BF] shadow-sm transition-all duration-300 hover:brightness-110"
                            style={{
                              height: `${(day.amount / maxWeekly) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{day.day}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" />
                    <span className="text-xs text-slate-500">
  Daily payments · {hasProcessedData ? "Imported SMS" : "Demo data"}
</span>
                  </div>
                </div>

                {/* Budget card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="font-bold">Monthly budget</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Your spending progress
                  </p>

                  <div className="mt-7 flex justify-center">
                    <div
                      className="relative flex h-44 w-44 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#0F766E ${budgetUsed}%, #E8F0EF ${budgetUsed}% 100%)`,
                      }}
                    >
                      <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-xs text-slate-500">Used</span>
                        <span className="mt-1 text-3xl font-bold">
                          {Math.round(budgetUsed)}%
                        </span>
                        <span className="mt-1 text-xs text-slate-400">of budget</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Net spending</span>
                      <strong>{money(netSpend)}</strong>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly limit</span>
                      <strong>{money(MONTHLY_BUDGET)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-sm">
                      <span className="font-medium text-[#0F766E]">Remaining</span>
                      <strong className="text-[#0F766E]">
                        {money(budgetRemaining)}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Category and insights */}
              <section className="grid gap-5 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">Where your money goes</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Expense category breakdown (after refunds)
                      </p>
                    </div>
                    <button
                      onClick={() => changePage("Transactions")}
                      className="text-xs font-semibold text-[#0F766E] hover:underline"
                    >
                      View details
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    {categories.map((category) => {
                      const Icon = category.icon;

                      return (
                        <div key={category.name}>
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon size={17} className="text-slate-400" />
                              <span className="text-sm font-medium">
                                {category.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400">
                                {category.share}%
                              </span>
                              <strong className="text-sm">
                                {money(category.amount)}
                              </strong>
                            </div>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${category.share}%`,
                                backgroundColor: category.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0F766E] p-6 text-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white/15 p-2">
                      <Lightbulb size={20} />
                    </div>
                    <span className="text-sm font-semibold">PaisaLens insight</span>
                  </div>

                  <h3 className="mt-6 text-xl font-bold leading-snug">
  {hasProcessedData && processedInsights?.insights
    ? "Your spending, explained"
    : `${topCategory.name} is your biggest spending category.`}
</h3>

<p className="mt-3 text-sm leading-6 text-teal-50">
  {hasProcessedData && processedInsights?.insights
  ? (Array.isArray(processedInsights.insights)
      ? processedInsights.insights.join(" ")
      : processedInsights.insights
    ).replace(/\*/g, "")
    : hasProcessedData
      ? "No AI insight is available for these transactions yet."
      : `In this sample, ${topCategory.name.toLowerCase()} accounts for ${topCategory.share}% of your net spending (${money(topCategory.amount)}). Reviewing a few purchases here could help you manage your monthly budget.`}
</p>

<button
  onClick={() => changePage("Insights")}
  className="mt-7 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0F766E] hover:bg-teal-50"
>
  Explore insights
  <ArrowUpRight size={17} />
</button>

<p className="mt-5 text-xs text-teal-100">
  {hasProcessedData
    ? processedInsights?.source === "gemini"
      ? "AI-generated insight · Not financial advice"
      : "Rule-based insight · Not financial advice"
    : "Sample insight · Not financial advice"}
</p>

                  

                  
                </div>
              </section>

              {/* Recent transactions (latest 5) */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">Recent transactions</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      A quick look at your latest activity
                    </p>
                  </div>

                  <button
                    onClick={() => changePage("Transactions")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    View all
                  </button>
                </div>

                <TransactionTable
  rows={sortedTransactions.slice(0, 5)}
  onSelectTransaction={setSelectedTransaction}
/>
              </section>


              <footer className="pb-4 text-center text-xs text-slate-400">
                PaisaLens provides budgeting insights, not financial advice.
                {hasProcessedData
                  ? " Figures are based on the SMS messages you imported. Please verify transaction details."
                  : " All figures currently shown are illustrative demo data."}
              </footer>
            </>
          )}
{activePage === "Transactions" && (
  <>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">All transactions</h2>
          <p className="mt-1 text-xs text-slate-500">
            {filteredTransactions.length} of {dashboardTransactions.length} transactions
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search transactions"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/10 sm:w-56"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 outline-none focus:border-[#0F766E]"
          >
            <option value="All">All categories</option>
            {Object.keys(categoryMeta).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 outline-none focus:border-[#0F766E]"
          >
            <option value="All">All statuses</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
            <option value="refund">Refunds</option>
            <option value="income">Income</option>
            <option value="not_a_transaction">Not a transaction</option>
          </select>

          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 outline-none focus:border-[#0F766E]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </div>
      </div>

      <TransactionTable rows={filteredTransactions} onSelectTransaction={setSelectedTransaction} />
    </section>
  </>
)}

  {activePage === "Import SMS" && (

          
            <section className="space-y-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#E8F4F1] px-3 py-1 text-xs font-semibold text-[#0F766E]">
                  <Upload size={14} /> Transaction import
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Bring your messages together.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Paste several transaction SMS messages, upload a TXT or CSV file,
                  or try synthetic demo messages. You do not need to enter each
                  expense separately.
                </p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#E8F4F1] p-2.5 text-[#0F766E]">
                      <ClipboardPaste size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Paste transaction messages</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Put one SMS message on each line.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={smsInputText}
                    onChange={(event) => {
                      setSmsInputText(event.target.value);
                      setPreviewMessages([]);
                    }}
                    rows={11}
                    placeholder={`Example:\nSBI: Rs.560 debited for UPI/SWIGGY on 17-11-2026.\nHDFC: Rs.300 refund credited from Amazon.\nYour UPI payment of Rs.500 failed.`}
                    className="mt-5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0F766E] focus:bg-white focus:ring-4 focus:ring-[#0F766E]/10"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={previewSmsMessages}
                      className="rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#115E59]"
                    >
                      Preview messages
                    </button>
                    <button
                      onClick={loadDemoMessages}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Load demo messages
                    </button>
                    <button
                      onClick={clearImportForm}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
                    >
                      <Trash2 size={15} /> Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold">Upload a file</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Supported formats: TXT and CSV · Maximum 2 MB
                        </p>
                      </div>
                    </div>

                    <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center transition hover:border-[#0F766E] hover:bg-[#F0F7F5]">
                      <div className="rounded-full bg-white p-3 text-[#0F766E] shadow-sm">
                        <Upload size={22} />
                      </div>
                      <span className="mt-3 text-sm font-semibold text-slate-700">
                        Choose a TXT or CSV file
                      </span>
                      <span className="mt-1 text-xs text-slate-400">
                        Browse files from your device
                      </span>
                      <input
                        type="file"
                        accept=".txt,.csv,text/plain,text/csv"
                        onChange={handleSmsFileChange}
                        className="sr-only"
                      />
                    </label>

                    {selectedFileName && (
                      <p className="mt-3 break-all text-xs text-slate-500">
                        Selected file: <strong>{selectedFileName}</strong>
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#D5EAE5] bg-[#F0F7F5] p-5">
                    <div className="flex items-center gap-2 text-[#0F766E]">
                      <Lightbulb size={18} />
                      <h3 className="text-sm font-bold">Try PaisaLens with sample data</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Load synthetic English and Hinglish transaction messages,
                      including a refund and a failed payment, to test the import flow.
                    </p>
                    <button
                      onClick={loadDemoMessages}
                      className="mt-4 rounded-xl border border-[#0F766E]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F766E] hover:bg-[#E8F4F1]"
                    >
                      Load sample messages
                    </button>
                  </div>
                </div>
              </div>

              {importNotice && (
                <div
                  className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                    importNoticeType === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-800"
                  }`}
                  role="status"
                >
                  {importNoticeType === "error" ? (
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                  )}
                  <span>{importNotice}</span>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold">Message preview</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Review the messages before connecting them to the transaction parser.
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {previewMessages.length} message{previewMessages.length === 1 ? "" : "s"} ready
                  </span>
                </div>

                {previewMessages.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {previewMessages.slice(0, 10).map((message, index) => (
                      <div
                        key={`${index}-${message}`}
                        className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm leading-6 text-slate-700">
                            {message}
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Awaiting transaction analysis
                          </span>
                        </div>
                      </div>
                    ))}
                    {previewMessages.length > 10 && (
                      <p className="text-center text-xs text-slate-500">
                        Showing the first 10 of {previewMessages.length} messages.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
                    <MessagePreviewEmpty />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      No messages to preview yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Paste messages, upload a file or load the demo data.
                    </p>
                  </div>
                 )}

                {previewMessages.length > 0 && (
                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={analyseSmsMessages}
                      disabled={isProcessing}
                      className="rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing
                        ? "Analysing transactions..."
                        : "Analyze & Update Dashboard"}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              <strong>How PaisaLens works:</strong> SMS messages are
                processed by the Python backend. Transaction parsing,
                refund matching and financial calculations are handled
                by Python. Gemini is used to explain verified financial
                results, not to calculate transaction amounts. Use
                synthetic sample messages for testing.
              </div>
              
            </section>
            
          )}

{activePage === "Insights" && (
  <section className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
        PAISALENS / PERSONAL FINANCE
      </p>
      <h2 className="mt-2 text-2xl font-bold">Your spending insights</h2>
      <p className="mt-2 text-sm text-slate-500">
        Understand where your money goes and discover ways to manage it better.
      </p>
    </div>

    {!hasProcessedData ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Lightbulb size={32} className="mx-auto text-[#0F766E]" />
        <h3 className="mt-4 text-lg font-bold">
          Your insights are waiting
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Import your bank or UPI SMS messages to generate personalised
          spending insights.
        </p>
        <button
          onClick={() => changePage("Import SMS")}
          className="mt-5 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#115E59]"
        >
          Import SMS
        </button>
      </div>
    ) : (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Gross spending"
            amount={money(processedSummary.gross_spend)}
            note="Successful payments"
            icon={Wallet}
            iconColor="text-blue-600"
            iconBackground="bg-blue-50"
          />
          <SummaryCard
            title="Net spending"
            amount={money(processedSummary.net_spend)}
            note="After matched refunds"
            icon={CreditCard}
            iconColor="text-[#0F766E]"
            iconBackground="bg-[#E8F4F1]"
          />
          <SummaryCard
            title="Refunds received"
            amount={money(processedSummary.total_refunds_received)}
            note="Including unmatched refunds"
            icon={ArrowDownLeft}
            iconColor="text-green-600"
            iconBackground="bg-green-50"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Category-wise spending</h3>
          <p className="mt-1 text-sm text-slate-500">
            Based on your imported transactions
          </p>

          <div className="mt-6 space-y-5">
            {Object.entries(processedCategorySpend)
              .filter(([, amount]) => Number(amount) > 0)
              .sort((a, b) => Number(b[1]) - Number(a[1]))
              .map(([category, amount]) => {
                const percentage =
                  processedSummary.net_spend > 0
                    ? (Number(amount) / processedSummary.net_spend) * 100
                    : 0;

                return (
                  <div key={category}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium">{category}</span>
                      <span className="text-slate-500">
                        {money(amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#0F766E]"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {Object.values(processedCategorySpend).every(
              (amount) => Number(amount) <= 0
            ) && (
              <p className="text-sm text-slate-500">
                No category spending data is available.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-[#0F766E] p-6 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <Lightbulb size={21} />
            <h3 className="font-semibold">AI spending analysis</h3>
          </div>

          <p className="mt-4 text-sm leading-7 text-teal-50">
            {processedInsights?.insights
  ? (Array.isArray(processedInsights.insights)
      ? processedInsights.insights.join(" ")
      : processedInsights.insights
    ).replace(/\*/g, "")
              : "No AI insight is available for these transactions yet."}
          </p>

          <p className="mt-5 text-xs text-teal-100">
            {processedInsights?.source === "gemini"
              ? "AI-generated insight · Not financial advice"
              : "Rule-based insight · Not financial advice"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">Transaction health</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Total income</p>
              <p className="mt-1 text-xl font-bold">
                {money(processedSummary.income)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Failed transactions</p>
              <p className="mt-1 text-xl font-bold">
                {processedSummary.failed_transactions}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Matched refunds</p>
              <p className="mt-1 text-xl font-bold">
                {money(processedSummary.matched_refunds)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Refund matching window</p>
              <p className="mt-1 text-xl font-bold">
                {processedSummary.refund_window_days} days
              </p>
            </div>
          </div>
        </div>
      </>
    )}
  </section>
)}

{activePage !== "Overview" &&

activePage === "Savings simulator" && (
  <section className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
        PAISALENS / SMART BUDGETING
      </p>
      <h2 className="mt-2 text-2xl font-bold">Savings simulator</h2>
      <p className="mt-2 text-sm text-slate-500">
        Explore how small spending changes could help you save more.
      </p>
    </div>

    {!hasProcessedData ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Wallet size={32} className="mx-auto text-[#0F766E]" />
        <h3 className="mt-4 text-lg font-bold">
          Import transactions to start
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Your savings simulation will use your actual imported spending.
        </p>
        <button
          onClick={() => changePage("Import SMS")}
          className="mt-5 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white"
        >
          Import SMS
        </button>
      </div>
    ) : (
      <>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">
            What if you reduce your spending?
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Adjust the slider to explore different savings possibilities.
          </p>

          <div className="mt-7 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">
              Spending reduction
            </span>
            <span className="text-xl font-bold text-[#0F766E]">
              {savingsReduction}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={savingsReduction}
            onChange={(event) =>
              setSavingsReduction(Number(event.target.value))
            }
            className="mt-5 w-full cursor-pointer accent-[#0F766E]"
          />

          <div className="flex justify-between text-xs text-slate-400">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Current imported net spending
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(netSpend)}
              </p>
            </div>

            <div className="rounded-xl bg-[#E8F4F1] p-4">
              <p className="text-sm text-[#0F766E]">
                Potential savings
              </p>
              <p className="mt-2 text-2xl font-bold text-[#0F766E]">
                {money(netSpend * savingsReduction / 100)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0F766E] p-6 text-white shadow-sm">
          <p className="text-sm text-teal-100">
            Your simulated spending after reduction
          </p>
          <h3 className="mt-3 text-3xl font-bold">
            {money(netSpend * (1 - savingsReduction / 100))}
          </h3>
          <p className="mt-3 text-sm text-teal-100">
            Potential annual savings if the same spending pattern repeats
          </p>
          <p className="mt-1 text-2xl font-bold">
            {money(netSpend * savingsReduction / 100 * 12)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">
            Category-wise savings opportunities
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Explore the potential reduction in each category.
          </p>

          <div className="mt-6 space-y-5">
            {Object.entries(processedCategorySpend)
              .filter(([, amount]) => Number(amount) > 0)
              .sort((a, b) => Number(b[1]) - Number(a[1]))
              .map(([category, amount]) => (
                <div key={category}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span className="text-[#0F766E]">
                      Save {money(Number(amount) * savingsReduction / 100)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Current: {money(amount)}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Simulations are estimates based on imported transaction data,
          not guaranteed savings or financial advice.
        </p>
      </>
    )}
  </section>
)}

{activePage !== "Overview" &&
activePage !== "Transactions" &&
activePage !== "Import SMS" &&

activePage !== "Insights" &&
activePage !== "Savings simulator" && (
  <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4F1] text-[#0F766E]">
        <Wallet size={27} />
      </div>
      <h2 className="mt-5 text-2xl font-bold">{activePage}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        This section is part of the PaisaLens development plan.
        We'll build and connect it step by step.
      </p>
      <button
        onClick={() => changePage("Overview")}
        className="mt-6 rounded-xl bg-[#0F766E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#115E59]"
      >
        Back to overview
      </button>
    </div>
  </section>
)}
      </div>
    </main>

{selectedTransaction && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            PAISALENS / TRANSACTION DETAILS
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            {selectedTransaction.merchant}
          </h2>
        </div>

        <button
          onClick={() => setSelectedTransaction(null)}
          className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100"
        >
          ×
        </button>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Transaction amount</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {money(selectedTransaction.amount)}
        </p>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Category</span>
          <span className="font-medium">{selectedTransaction.category}</span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Date</span>
          <span className="font-medium">
            {formatDate(selectedTransaction.date)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Status</span>
          <span className="font-medium capitalize">
            {selectedTransaction.status ||
  (selectedTransaction.type === "credit" ? "Refund" : "Successful")}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Net amount</span>
          <span className="font-semibold">
            {selectedTransaction.netAmount !== undefined &&
            selectedTransaction.netAmount !== null
              ? money(selectedTransaction.netAmount)
              : "Not calculated for demo data"}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4">
        <p className="text-sm font-semibold text-teal-800">
          Why was this transaction treated this way?
        </p>
        <p className="mt-2 text-sm leading-6 text-teal-900">
          {selectedTransaction.reason ||
  selectedTransaction.treatment ||
  (selectedTransaction.type === "credit"
    ? "This demo credit is displayed as a refund. Refund matching details are not available in demo data."
    : "This is a successful demo payment. Detailed processing information is not available for demo data.")}
    {selectedTransaction.matchConfidence && (
  <p className="mt-3 text-xs font-medium text-teal-800">
    Refund matching confidence:{" "}
    {selectedTransaction.matchConfidence}
  </p>
)}
        </p>
      </div>

      <button
        onClick={() => setSelectedTransaction(null)}
        className="mt-5 w-full rounded-xl bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#115E59]"
      >
        Close details
      </button>
    </div>
  </div>
)}

    </div>

  
);
}
/* ------------------------------------------------------------------ */
/* SMALL REUSABLE COMPONENTS                                           */
/* ------------------------------------------------------------------ */

function MessagePreviewEmpty() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F4F1] text-[#0F766E]">
      <FileText size={23} />
    </div>
  );
}



function SummaryCard({
  title,
  amount,
  note,
  icon: Icon,
  iconColor,
  iconBackground,
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_12px_28px_rgba(15,118,110,0.10)] sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-slate-500">
          {title}
        </span>

        <div
          className={`rounded-xl p-3 transition-transform duration-300 group-hover:scale-110 ${iconBackground} ${iconColor}`}
        >
          <Icon size={21} />
        </div>
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-[#142B3A] sm:text-3xl">
        {amount}
      </h3>

      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400">
        {note}
      </p>

      <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-[#0F766E] to-[#2DD4BF] transition-all duration-300 group-hover:w-full" />
    </div>
  );
}


// Used on both the Overview and Transactions pages
function TransactionTable({ rows, onSelectTransaction }) {
  return (
   <div className="mt-5 overflow-x-auto rounded-xl">
      <table className="w-full min-w-[600px] text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <th className="pb-3 font-medium">Merchant</th>
            <th className="pb-3 font-medium">Category</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 text-right font-medium">Amount</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((transaction) => {
            const isCredit = transaction.type === "credit";
            const displayStatus =
  transaction.status ||
  (transaction.type === "credit" ? "refund" : "success");
const isFailed = displayStatus === "failed";
const isNotTransaction = displayStatus === "not_a_transaction";

const Icon = isCredit
  ? ArrowDownLeft
  : isFailed
    ? AlertCircle
    : getCategoryMeta(transaction.category).icon;



            return (
              <tr
                  key={transaction.id}
                   onClick={() => onSelectTransaction(transaction)}
                     className="group cursor-pointer border-b border-slate-100 last:border-0 transition-all duration-200 hover:bg-teal-50/50"
                 >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F4F1] text-[#0F766E] transition-colors group-hover:bg-[#D1FAE5]">
                      <Icon size={17} />
                    </div>
                    <span className="text-sm font-semibold">
                      {transaction.merchant}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-sm text-slate-500">
                  {transaction.category}
                </td>
                <td className="py-4 text-xs text-slate-400">
                  {formatDate(transaction.date)}
                </td>
               
<td className="py-4">
  <span
    className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
      displayStatus === "failed" ||
      displayStatus === "not_a_transaction"
        ? "bg-red-50 text-red-700"
        : displayStatus === "refund"
          ? "bg-blue-50 text-blue-700"
          : displayStatus  === "income"
            ? "bg-purple-50 text-purple-700"
            : "bg-green-50 text-green-700"
    }`}
  >
    {displayStatus === "failed"
      ? "Failed"
      : displayStatus === "not_a_transaction"
        ? "Not a transaction"
        : displayStatus    === "refund"
          ? "Refund"
          : displayStatus === "income"
            ? "Income"
            : "Successful"}
  </span>
</td>

                <td
                  className={`py-4 text-right text-sm font-semibold ${
                    isCredit ? "text-green-600" : "text-slate-800"
                  }`}
                >
                  {isCredit ? "+" : "−"}
                  {money(transaction.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          No matching transactions found.
        </p>
      )}
    </div>
  );
}

export default App;


