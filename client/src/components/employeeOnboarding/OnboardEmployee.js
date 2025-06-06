import React from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import axios from "axios";
import { validationSchema } from "../../schemas/employeeOnboarding/onboardEmployee";

function OnboardEmployee() {
  const formik = useFormik({
    initialValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      company: "",
      employment_type: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/onboard-employee`,
        values
      );
      alert(res.data.message);
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <Row>
        <Col xs={4}>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="first_name"
            name="first_name"
            label="First Name"
            value={formik.values.first_name}
            onChange={formik.handleChange}
            error={
              formik.touched.first_name && Boolean(formik.errors.first_name)
            }
            helperText={formik.touched.first_name && formik.errors.first_name}
            className="login-input"
          />
        </Col>

        <Col xs={4}>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="middle_name"
            name="middle_name"
            label="Middle Name"
            value={formik.values.middle_name}
            onChange={formik.handleChange}
            error={
              formik.touched.middle_name && Boolean(formik.errors.middle_name)
            }
            helperText={formik.touched.middle_name && formik.errors.middle_name}
            className="login-input"
          />
        </Col>

        <Col xs={4}>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="last_name"
            name="last_name"
            label="Last Name"
            value={formik.values.last_name}
            onChange={formik.handleChange}
            error={formik.touched.last_name && Boolean(formik.errors.last_name)}
            helperText={formik.touched.last_name && formik.errors.last_name}
            className="login-input"
          />
        </Col>
      </Row>

      <Row>
        <Col xs={4}>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="email"
            name="email"
            label="Email"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            className="login-input"
          />
        </Col>

        <Col xs={4}>
          <TextField
            select
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="company"
            name="company"
            label="Company"
            value={formik.values.company}
            onChange={formik.handleChange}
            error={formik.touched.company && Boolean(formik.errors.company)}
            helperText={formik.touched.company && formik.errors.company}
            className="login-input"
          >
            <MenuItem value="Suraj Forwarders Private Limited">
              Suraj Forwarders Private Limited
            </MenuItem>
            <MenuItem value="Suraj Forwarders & Shipping Agencies">
              Suraj Forwarders & Shipping Agencies
            </MenuItem>
            <MenuItem value="Suraj Forwarders">Suraj Forwarders</MenuItem>
            <MenuItem value="EXIMBIZ Enterprise">EXIMBIZ Enterprise</MenuItem>
            <MenuItem value="Sansar Tradelink">Sansar Tradelink</MenuItem>

            <MenuItem value="Paramount Propack Private Limited">
              Paramount Propack Private Limited
            </MenuItem>
            <MenuItem value="SR Container Carriers">
              SR Container Carriers
            </MenuItem>
            <MenuItem value="RABS Industries India Private Limited">
              RABS Industries India Private Limited
            </MenuItem>
            <MenuItem value="Novusha Consulting Services India LLP">
              Novusha Consulting Services India LLP
            </MenuItem>
            <MenuItem value="Alluvium IoT Solutions Private Limited">
              Alluvium IoT Solutions Private Limited
            </MenuItem>
          </TextField>
        </Col>

        <Col xs={4}>
          <TextField
            label="Employment type"
            select
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="employment_type"
            name="employment_type"
            value={formik.values.employment_type}
            onChange={formik.handleChange}
            error={
              formik.touched.employment_type &&
              Boolean(formik.errors.employment_type)
            }
            helperText={
              formik.touched.employment_type && formik.errors.employment_type
            }
            className="login-input"
          >
            <MenuItem value="Internship">Internship</MenuItem>
            <MenuItem value="Probation">Probation</MenuItem>
            <MenuItem value="Permanent">Permanent</MenuItem>
          </TextField>
        </Col>
      </Row>

      <button className="btn" type="submit">
        Submit
      </button>
    </form>
  );
}

export default React.memo(OnboardEmployee);
