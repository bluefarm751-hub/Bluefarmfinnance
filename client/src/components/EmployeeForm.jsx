import {
  Grid,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Box,
} from "@mui/material";

import PhotoCamera from "@mui/icons-material/PhotoCamera";

export default function EmployeeForm({ formData, setFormData }) {

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setFormData({
        ...formData,
        photo: reader.result,
      });
    };

    reader.readAsDataURL(file);
  };

  return (
    <>

      {/* CARD 1: Personal Information */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
        }}
      >
        <CardContent>

          <Typography
            variant="h5"
            fontWeight="bold"
            mb={3}
          >
            Personal Information
          </Typography>

          <Grid container spacing={3}>

            {/* Avatar Section */}
            <Grid
              item
              xs={12}
              md={3}
            >
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
              >
                <Avatar
                  src={formData.photo}
                  sx={{
                    width: 160,
                    height: 190,
                    mb: 2,
                    border: "3px solid #1976d2",
                  }}
                />
                <Button
                  component="label"
                  variant="contained"
                  startIcon={<PhotoCamera />}
                >
                  Upload Photo
                  <input
                    hidden
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handlePhoto}
                  />
                </Button>
              </Box>
            </Grid>

            {/* Top 6 Inputs (Right Side 75% width) */}
            <Grid
              item
              xs={12}
              md={9}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth disabled label="Employee No" name="employeeNo" value={formData.employeeNo} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Employee Name" name="name" value={formData.name} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Father Name" name="fatherName" value={formData.fatherName} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="CNIC" name="cnic" value={formData.cnic} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Mobile" name="mobile" value={formData.mobile} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Family Mobile" name="familyMobile" value={formData.familyMobile} onChange={handleChange} />
                </Grid>
              </Grid>
            </Grid>

            {/* ADDRESS — full width single-line, double length (visible without scrolling) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </Grid>

          </Grid>

        </CardContent>
      </Card>

      {/* CARD 2: Employment Information */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
        }}
      >
        <CardContent>

          <Typography
            variant="h5"
            fontWeight="bold"
            mb={3}
          >
            Employment Information
          </Typography>

          <Grid container spacing={2}>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Appointment" name="appointment" value={formData.appointment} onChange={handleChange} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Department" name="department" value={formData.department} onChange={handleChange} />
            </Grid>

            {/* ✅ FIX 2: CALENDAR (Click right side icon, or click box to show browser's native calendar) */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Joining Date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Employee Type" name="employeeType" value={formData.employeeType} onChange={handleChange}>
                <MenuItem value="Permanent">Permanent</MenuItem>
                <MenuItem value="Contract">Contract</MenuItem>
                <MenuItem value="Daily Wages">Daily Wages</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Status" name="status" value={formData.status} onChange={handleChange}>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Grid>

          </Grid>

        </CardContent>
      </Card>

      {/* CARD 3: Salary & Bank Information */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
        }}
      >
        <CardContent>

          <Typography
            variant="h5"
            fontWeight="bold"
            mb={3}
          >
            Salary & Bank Information
          </Typography>

          <Grid container spacing={2}>

            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Gross Salary" name="grossSalary" value={formData.grossSalary} onChange={handleChange} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Account Title" name="accountTitle" value={formData.accountTitle} onChange={handleChange} />
            </Grid>

            {/* IBAN — full width single-line double length */}
            <Grid item xs={12}>
              <TextField fullWidth label="IBAN" name="iban" value={formData.iban} onChange={handleChange} />
            </Grid>

          </Grid>

        </CardContent>
      </Card>

      {/* CARD 4: Documents & Remarks */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
        }}
      >
        <CardContent>

          <Typography
            variant="h5"
            fontWeight="bold"
            mb={3}
          >
            Documents & Remarks
          </Typography>

          <Grid container spacing={3}>

            <Grid item xs={12} md={4}>
              <Typography fontWeight="bold" mb={1}>CNIC Copy</Typography>
              {formData.cnicCopy && (
                <Avatar src={formData.cnicCopy} variant="rounded" sx={{ width: "100%", height: 180, mb: 2 }} />
              )}
              <Button component="label" variant="outlined" fullWidth>
                Upload CNIC
                <input
                  hidden type="file" accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData({ ...formData, cnicCopy: reader.result });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </Button>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField fullWidth multiline rows={8} label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
            </Grid>

          </Grid>

        </CardContent>
      </Card>

    </>
  );
}