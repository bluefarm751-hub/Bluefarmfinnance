import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Ledger() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/ledger/general", { replace: true }); }, [navigate]);
  return null;
}
