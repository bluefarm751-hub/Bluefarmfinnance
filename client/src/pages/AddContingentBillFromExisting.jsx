import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Chip,
  Divider,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

import MainLayout from "../layouts/MainLayout";
import { getFinanceHeads, getBills } from "../api/financeApi";
import { getHoRemittances } from "../api/cashbookApi";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

function fmtMoney(n) {
  return `Rs. ${Number(n || 0).toLocaleString()}`;
}

export default function AddContingentBillFromExisting() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [heads, setHeads] = useState([]);
  const [bills, setBills] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [loading, setLoading] = useState(true);

  // "head-wise" filter — narrows the Bills list down to one finance head
  const [headFilter, setHeadFilter] = useState("all");

  const [selectedBillIds, setSelectedBillIds] = useState(() => new Set());
  const [selectedRemitIds, setSelectedRemitIds] = useState(() => new Set());

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [headRes, billRes, remitRes] = await Promise.all([
        getFinanceHeads(),
        getBills(),
        getHoRemittances({}),
      ]);
      setHeads(headRes.data || []);
      setBills(billRes.data || []);
      setRemittances(remitRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load bills / HQ remittances", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = useMemo(() => {
    if (headFilter === "all") return bills;
    return bills.filter((b) => String(b.headId) === String(headFilter));
  }, [bills, headFilter]);

  const toggleBill = (id) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRemit = (id) => {
    setSelectedRemitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredBillsSelected =
    filteredBills.length > 0 && filteredBills.every((b) => selectedBillIds.has(b.id));

  const toggleSelectAllFilteredBills = () => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (allFilteredBillsSelected) {
        filteredBills.forEach((b) => next.delete(b.id));
      } else {
        filteredBills.forEach((b) => next.add(b.id));
      }
      return next;
    });
  };

  const allRemitSelected = remittances.length > 0 && remittances.every((r) => selectedRemitIds.has(r.id));

  const toggleSelectAllRemits = () => {
    setSelectedRemitIds((prev) => {
      const next = new Set(prev);
      if (allRemitSelected) {
        remittances.forEach((r) => next.delete(r.id));
      } else {
        remittances.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const selectedBills = bills.filter((b) => selectedBillIds.has(b.id));
  const selectedRemits = remittances.filter((r) => selectedRemitIds.has(r.id));

  const selectedTotal =
    selectedBills.reduce((s, b) => s + (Number(b.amount) || 0), 0) +
    selectedRemits.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const selectedCount = selectedBills.length + selectedRemits.length;

  const handleContinue = () => {
    if (selectedCount === 0) {
      showToast("Select at least one bill or HQ remittance", "error");
      return;
    }

    const billRows = selectedBills.map((b) => ({
      billNo: b.sNo != null ? String(b.sNo) : "",
      billDate: b.billDate || "",
      description: b.item || b.headName || "Bill",
      amount: String(b.amount ?? ""),
    }));

    const remitRows = selectedRemits.map((r) => ({
      billNo: r.voucherNo || "",
      billDate: r.entryDate || "",
      description: [
        "HQ Remittance",
        r.transferMode ? `(${r.transferMode})` : "",
        r.bankRef ? `Ref: ${r.bankRef}` : "",
        r.remarks || "",
      ].filter(Boolean).join(" — "),
      amount: String(r.amount ?? ""),
    }));

    navigate("/finance/add-contingent-bill", {
      state: { prefillRows: [...billRows, ...remitRows] },
    });
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>FROM EXISTING RECORDS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Add Contingent Bill (From Existing Bill / HQ Remittance)
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Tick the Bills and/or HQ Remittances you want to combine, then continue to build the
          Contingent Bill voucher — the rows below will be pre-filled for you.
        </Typography>

        {/* ---------- Bills ---------- */}
        <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <ReceiptIcon sx={{ color: brand.ink }} />
              <Typography sx={{ fontWeight: 800, color: brand.ink, flexGrow: 1 }}>Bills</Typography>
              <TextField
                select
                size="small"
                label="Head"
                value={headFilter}
                onChange={(e) => setHeadFilter(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="all">All Heads</MenuItem>
                {heads.map((h) => (
                  <MenuItem key={h.id} value={h.id}>{h.headName}</MenuItem>
                ))}
              </TextField>
              <Button size="small" variant="outlined" onClick={toggleSelectAllFilteredBills} disabled={filteredBills.length === 0}>
                {allFilteredBillsSelected ? "Unselect All" : "Select All"}
              </Button>
            </Box>

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>S No</TableCell>
                    <TableCell>Head</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ color: brand.slate }}>No bills found</TableCell></TableRow>
                  )}
                  {filteredBills.map((b) => (
                    <TableRow key={b.id} hover selected={selectedBillIds.has(b.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedBillIds.has(b.id)} onChange={() => toggleBill(b.id)} />
                      </TableCell>
                      <TableCell>{b.sNo}</TableCell>
                      <TableCell>{b.headName || "—"}</TableCell>
                      <TableCell>{b.item || "—"}</TableCell>
                      <TableCell>{b.billDate || "—"}</TableCell>
                      <TableCell align="right">{fmtMoney(b.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        {/* ---------- HQ Remittances ---------- */}
        <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <AccountBalanceIcon sx={{ color: brand.ink }} />
              <Typography sx={{ fontWeight: 800, color: brand.ink, flexGrow: 1 }}>HQ Remittances</Typography>
              <Button size="small" variant="outlined" onClick={toggleSelectAllRemits} disabled={remittances.length === 0}>
                {allRemitSelected ? "Unselect All" : "Select All"}
              </Button>
            </Box>

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Voucher No</TableCell>
                    <TableCell>Bank Ref / UTR</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Remarks</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {remittances.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ color: brand.slate }}>No HQ remittances found</TableCell></TableRow>
                  )}
                  {remittances.map((r) => (
                    <TableRow key={r.id} hover selected={selectedRemitIds.has(r.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedRemitIds.has(r.id)} onChange={() => toggleRemit(r.id)} />
                      </TableCell>
                      <TableCell>{r.voucherNo || "—"}</TableCell>
                      <TableCell>{r.bankRef || "—"}</TableCell>
                      <TableCell>{r.transferMode || "—"}</TableCell>
                      <TableCell>{r.entryDate || "—"}</TableCell>
                      <TableCell>{r.remarks || "—"}</TableCell>
                      <TableCell align="right">{fmtMoney(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        {/* ---------- Selection summary / continue ---------- */}
        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Chip label={`${selectedCount} item(s) selected`} sx={{ fontWeight: 700 }} />
            <Divider orientation="vertical" flexItem />
            <Typography sx={{ fontWeight: 800, color: brand.ink }}>
              Selected Total: {fmtMoney(selectedTotal)}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate("/finance")}
              sx={{ background: "#6B7280", "&:hover": { background: "#4B5563" } }}>
              Cancel
            </Button>
            <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleContinue}
              sx={{ background: gradients.brand }}>
              Continue to Contingent Bill
            </Button>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
