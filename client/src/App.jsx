import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import SelectFarm from "./pages/SelectFarm";
import Loading from "./pages/Loading";

import Employees from "./pages/Employees";
import AddEmployee from "./pages/AddEmployee";
import EditEmployee from "./pages/EditEmployee";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeList from "./pages/EmployeeList";

import Finance from "./pages/Finance";
import AddHead from "./pages/AddHead";
import EditHead from "./pages/EditHead";
import AddBill from "./pages/AddBill";
import EditBill from "./pages/EditBill";
import FinanceTemporaryReceipt from "./pages/FinanceTemporaryReceipt";
import BillReport from "./pages/BillReport";
import AddAllocation from "./pages/AddAllocation";
import AddIncome from "./pages/AddIncome";
import ReportAllocation from "./pages/ReportAllocation";
import AddContingentBill from "./pages/AddContingentBill";
import AddContingentBillFromExisting from "./pages/AddContingentBillFromExisting";
import EditContingentBill from "./pages/EditContingentBill";
import ContingentBillReport from "./pages/ContingentBillReport";
import CashBook from "./pages/CashBook";
import ComingSoon from "./pages/ComingSoon";

import Ledger from "./pages/Ledger";
import GeneralLedger from "./pages/GeneralLedger";
import PartyLedger from "./pages/PartyLedger";
import AddLedgerEntry from "./pages/AddLedgerEntry";
import ManageParties from "./pages/ManageParties";

import UpdateSalary from "./pages/UpdateSalary";
import GenerateSalary from "./pages/GenerateSalary";
import UndoSalary from "./pages/UndoSalary";
import ReportSalary from "./pages/ReportSalary";
import ReportInfo from "./pages/ReportInfo";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import F5RefreshAnimation from "./components/F5RefreshAnimation";

// Every page that shows real data is wrapped in <ProtectedRoute> so it can't
// be opened by typing/bookmarking its URL directly without logging in first
// — previously only 4 of the ~30 routes here were actually protected, so
// most of the app (Add Employee, all Salary pages, Add Bill, Ledger
// entries, etc.) could be reached with no login at all as long as you knew
// or guessed the URL.
function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const splash = document.getElementById("app-splash");
    if (splash) {
      const timer = setTimeout(() => {
        splash.classList.add("app-splash-hide");
        setTimeout(() => splash.remove(), 500);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, []);

  const p = (el) => <ProtectedRoute>{el}</ProtectedRoute>;
  // Finance, Cash Book, and Ledger are locked for Blue Farm / Blue Remounts
  // logins — only admin (and Accounts Office) can open these, even via URL.
  const pAdmin = (el) => <ProtectedRoute adminOnly>{el}</ProtectedRoute>;

  return (
    <>
      <Routes key={refreshKey}>
      <Route path="/" element={<Login />} />

      <Route path="/select-farm" element={p(<SelectFarm />)} />
      <Route path="/loading" element={p(<Loading />)} />

      {/* Tab 1: Employees (dashboard-style summary) */}
      <Route path="/employees" element={p(<Employees />)} />
      {/* Tab 2: Add Employee */}
      <Route path="/employees/add" element={p(<AddEmployee />)} />
      {/* Tab 3: View Employee */}
      <Route path="/employees/list" element={p(<EmployeeList />)} />
      <Route path="/employees/edit/:id" element={p(<EditEmployee />)} />
      <Route path="/employees/view/:id" element={p(<EmployeeProfile />)} />

      {/* Tab 4-7: Salary workflow (admin only) */}
      <Route path="/salary/update" element={p(<UpdateSalary />)} />
      <Route path="/salary/generate" element={p(<GenerateSalary />)} />
      <Route path="/salary/undo" element={p(<UndoSalary />)} />
      <Route path="/salary/report" element={p(<ReportSalary />)} />

      {/* Tab 8: Report Info */}
      <Route path="/reports/info" element={p(<ReportInfo />)} />

      {/* Finance group: dashboard cards + Add Head (admin / Accounts Office only) */}
      <Route path="/finance" element={pAdmin(<Finance />)} />
      <Route path="/finance/add-head" element={pAdmin(<AddHead />)} />
      <Route path="/finance/edit-head" element={pAdmin(<EditHead />)} />
      <Route path="/finance/add-income" element={pAdmin(<AddIncome />)} />
      <Route path="/finance/add-bill" element={pAdmin(<AddBill />)} />
      <Route path="/finance/edit-bill" element={pAdmin(<EditBill />)} />
      <Route path="/finance/temporary-receipt" element={pAdmin(<FinanceTemporaryReceipt />)} />
      <Route path="/finance/bill-report" element={pAdmin(<BillReport />)} />
      <Route path="/finance/add-allocation" element={pAdmin(<AddAllocation />)} />
      <Route path="/finance/report-allocation" element={pAdmin(<ReportAllocation />)} />
      <Route path="/finance/add-contingent-bill" element={pAdmin(<AddContingentBill />)} />
      <Route path="/finance/add-contingent-bill-from-existing" element={pAdmin(<AddContingentBillFromExisting />)} />
      <Route path="/finance/edit-contingent-bill/:id" element={pAdmin(<EditContingentBill />)} />
      <Route path="/finance/contingent-bill-report" element={pAdmin(<ContingentBillReport />)} />

      {/* Cash Book (admin / Accounts Office only) */}
      <Route path="/cashbook" element={pAdmin(<CashBook />)} />

      {/* Ledger (admin / Accounts Office only) */}
      <Route path="/ledger" element={pAdmin(<Ledger />)} />
      <Route path="/ledger/general" element={pAdmin(<GeneralLedger />)} />
      <Route path="/ledger/party" element={pAdmin(<PartyLedger />)} />
      <Route path="/ledger/add-entry" element={pAdmin(<AddLedgerEntry />)} />
      <Route path="/ledger/parties" element={pAdmin(<ManageParties />)} />
      <Route path="/ledger/balance-sheet" element={pAdmin(<ComingSoon title="Balance Sheet" />)} />

      {/* Tab 9: About */}
      <Route path="/about" element={p(<About />)} />
      <Route path="*" element={<NotFound />} />
      </Routes>
      <F5RefreshAnimation onRefresh={() => setRefreshKey((k) => k + 1)} />
    </>
  );
}

export default App;
