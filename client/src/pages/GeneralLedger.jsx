import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, Typography } from "@mui/material";
import { FaFileExcel, FaFilePdf, FaPrint, FaBook } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import DateFieldDMY from "../components/DateFieldDMY";
import { SectionCard, DataTable, money, signedMoney } from "../components/CashBook/ui";
import { getBalanceSheet } from "../api/ledgerApi";
import LedgerTabs from "../components/LedgerTabs";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";

const columns = [
  { key: "date", label: "Date" },
  { key: "voucherNo", label: "Voucher No" },
  { key: "party", label: "Party" },
  { key: "description", label: "Description" },
  { key: "source", label: "Source" },
  { key: "debit", label: "Debit", align: "right", render: (r) => (r.debit ? money(r.debit) : "") },
  { key: "credit", label: "Credit", align: "right", render: (r) => (r.credit ? money(r.credit) : "") },
  { key: "balance", label: "Balance", align: "right", render: (r) => signedMoney(r.balance) },
];

export default function GeneralLedger() {
  const { ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [data, setData] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [openHead, setOpenHead] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBalanceSheet();
      const next = res.data || { rows: [], totals: {} };
      setData(next);
      if (openHead === null && next.rows?.length) setOpenHead(next.rows[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rows = data.rows || [];
  const totals = data.totals || {};
  const fmt = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        <Typography variant="h4" fontWeight="bold" mb={0.5}>Main Ledger</Typography>
        <Typography color="text.secondary" mb={2.5}>
          All Heads are loaded automatically from added bills. Click a Head to see every bill in sequence. Every bill — Paid or Payable — reduces the Head balance.
        </Typography>
        <LedgerTabs />

        <SectionCard title={<><FaBook style={{ marginRight: 8, verticalAlign: -2 }} />Main Ledger — {farm}</>}>
          {loading ? <Typography sx={{ py: 6, textAlign: "center" }}>Loading ledger...</Typography> : !rows.length ? (
            <Typography sx={{ py: 6, textAlign: "center" }}>No Heads or Bills found.</Typography>
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
                {rows.map((head) => (
                  <Button key={head.id} size="small" variant={openHead === head.id ? "contained" : "outlined"} onClick={() => setOpenHead(head.id)}>
                    {head.headName}
                  </Button>
                ))}
              </Box>

              <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, background: "#f1f6fa", display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Typography fontWeight={800}>Total Heads: {rows.length}</Typography>
                <Typography fontWeight={800}>Total Head Balance: {fmt(totals.totalAmount)}</Typography>
                <Typography fontWeight={800}>Bills: {fmt(totals.billAmount)}</Typography>
                <Typography fontWeight={800}>Final Remaining: {fmt(totals.remaining)}</Typography>
                <Typography fontWeight={800} color="#C0392B">Payable included: {fmt(totals.payableAmount)}</Typography>
              </Box>

              {rows.filter((r) => openHead === null || r.id === openHead).map((head) => {
                let running = Number(head.totalAmount || 0);
                return (
                  <Box key={head.id} sx={{ border: "1px solid #d9e4ec", borderRadius: 3, overflow: "hidden" }}>
                    <Box sx={{ p: 2, background: "linear-gradient(135deg,#0F4C81 0%,#16608f 100%)", color: "#fff", display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                      <Box><Typography fontWeight={900} fontSize={19}>{head.headName}</Typography><Typography fontSize={12.5}>Opening / Full Head Balance: {fmt(head.totalAmount)}</Typography></Box>
                      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}><Typography fontWeight={900}>Final Remaining: {fmt(head.remaining)}</Typography><Typography fontSize={12.5}>Payable: {fmt(head.payableAmount)}</Typography></Box>
                    </Box>
                    {!head.bills?.length ? <Typography sx={{ p: 3 }}>No bills under this Head.</Typography> : (
                      <Box sx={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                          <thead><tr>{["#", "Bill No", "Date", "Contractor", "Description", "Status", "Bill Amount", "Remaining Amount"].map((h) => <th key={h} style={{ textAlign: ["Bill Amount", "Remaining Amount"].includes(h) ? "right" : "left", padding: "11px 10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec" }}>{h}</th>)}</tr></thead>
                          <tbody>{head.bills.map((bill, i) => {
                            running -= Number(bill.amount || 0);
                            return <tr key={bill.id}>
                              <td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}>{i + 1}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #edf1f4", fontWeight: 800 }}>{bill.billNo}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}>{bill.billDate || "—"}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}>{bill.contractorName || "—"}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #edf1f4" }}>{bill.item || bill.remarks || "—"}</td>
                              <td style={{ padding: 10, borderBottom: "1px solid #edf1f4", fontWeight: 700, color: String(bill.status).toLowerCase() === "paid" ? "#1B8A50" : "#C0392B" }}>{bill.status || "Payable"}</td>
                              <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #edf1f4", fontWeight: 800 }}>{fmt(bill.amount)}</td>
                              <td style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #edf1f4", fontWeight: 900, color: running < 0 ? "#C0392B" : "#1B5E3B" }}>{fmt(running)}</td>
                            </tr>;
                          })}</tbody>
                          <tfoot><tr><td colSpan={6} style={{ padding: 12, fontWeight: 900, color: "#0F4C81" }}>Head Final Balance</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(head.billAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(head.remaining)}</td></tr></tfoot>
                        </table>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </>
          )}
        </SectionCard>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
