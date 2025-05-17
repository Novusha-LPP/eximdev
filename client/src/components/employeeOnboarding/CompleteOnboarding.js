import React, { useContext, useState } from "react";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import Snackbar from "@mui/material/Snackbar";
import { handleSingleFileUpload } from "../../utils/awsSingleFileUpload";
import { validationSchema } from "../../schemas/employeeOnboarding/completeOnboarding";

function CompleteOnboarding() {
  const { user } = useContext(UserContext);
  const [fileSnackbar, setFileSnackbar] = useState(false);

  const formik = useFormik({
    initialValues: {
      skill: "",
      company_policy_visited: "",
      introduction_with_md: "",
      employee_photo: "",
      resume: "",
      address_proof: "",
      nda: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log(values);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/complete-onboarding`,
        { ...values, username: user.username }
      );
      alert(res.data.message);
      resetForm();
    },
  });

  const employee_name = [user.first_name, user.middle_name, user.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <form onSubmit={formik.handleSubmit}>
      Name:&nbsp;
      {employee_name}
      <br />
      Email:&nbsp;{user.email}
      <br />
      Company:&nbsp;{user.company}
      <br />
      Employment Type:&nbsp;{user.employment_type}
      <br />
      <Row>
        <Col xs={4}>
          <TextField
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="skill"
            name="skill"
            label="Skill/Hobby"
            value={formik.values.skill}
            onChange={formik.handleChange}
            error={formik.touched.skill && Boolean(formik.errors.skill)}
            helperText={formik.touched.skill && formik.errors.skill}
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
            id="company_policy_visited"
            name="company_policy_visited"
            label="Gone through company policy?"
            value={formik.values.company_policy_visited}
            onChange={formik.handleChange}
            error={
              formik.touched.company_policy_visited &&
              Boolean(formik.errors.company_policy_visited)
            }
            helperText={
              formik.touched.company_policy_visited &&
              formik.errors.company_policy_visited
            }
            className="login-input"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        </Col>

        <Col xs={4}>
          <TextField
            select
            size="small"
            margin="dense"
            variant="filled"
            fullWidth
            id="introduction_with_md"
            name="introduction_with_md"
            label="Introduction has been done with Rajan Sir?"
            value={formik.values.introduction_with_md}
            onChange={formik.handleChange}
            error={
              formik.touched.introduction_with_md &&
              Boolean(formik.errors.introduction_with_md)
            }
            helperText={
              formik.touched.introduction_with_md &&
              formik.errors.introduction_with_md
            }
            className="login-input"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        </Col>
      </Row>
      <br />
      <Row>
        <Col>
          <label htmlFor="">Employee Photo:&nbsp;</label>
          <input
            type="file"
            name=""
            id=""
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "employee_photo",
                "kyc",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.employee_photo && formik.errors.employee_photo ? (
            <div style={{ color: "#D32F2F" }}>
              {formik.errors.employee_photo}
            </div>
          ) : null}
          {formik.values.employee_photo !== "" ? (
            <>
              <br />
              <a href={formik.values.employee_photo}>
                {formik.values.employee_photo}
              </a>
            </>
          ) : (
            ""
          )}
        </Col>
        <Col>
          <label htmlFor="">Upload Resume:&nbsp;</label>
          <input
            type="file"
            name=""
            id=""
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "resume",
                "kyc",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.resume && formik.errors.resume ? (
            <div style={{ color: "#D32F2F" }}>{formik.errors.resume}</div>
          ) : null}
          {formik.values.resume !== "" ? (
            <>
              <br />
              <a href={formik.values.resume}>{formik.values.resume}</a>
            </>
          ) : (
            ""
          )}
        </Col>
      </Row>
      <br />
      <Row>
        <Col>
          <label htmlFor="">Upload Address Proof:&nbsp;</label>
          <input
            type="file"
            name=""
            id=""
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "address_proof",
                "kyc",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.address_proof && formik.errors.address_proof ? (
            <div style={{ color: "#D32F2F" }}>
              {formik.errors.address_proof}
            </div>
          ) : null}
          {formik.values.address_proof !== "" ? (
            <>
              <br />
              <a href={formik.values.address_proof}>
                {formik.values.address_proof}
              </a>
            </>
          ) : (
            ""
          )}
        </Col>
        <Col>
          {user.company === "Alluvium IoT Solutions Private Limited" && (
            <>
              <label htmlFor="">Upload Signed NDA:&nbsp;</label>
              <input
                type="file"
                name=""
                id=""
                onChange={(e) =>
                  handleSingleFileUpload(
                    e,
                    "nda",
                    "kyc",
                    formik,
                    setFileSnackbar
                  )
                }
              />
              {formik.touched.nda && formik.errors.nda ? (
                <div style={{ color: "#D32F2F" }}>{formik.errors.nda}</div>
              ) : null}
              {formik.values.nda !== "" ? (
                <>
                  <br />
                  <a href={formik.values.nda}>{formik.values.nda}</a>
                </>
              ) : (
                ""
              )}
            </>
          )}
        </Col>
      </Row>
      <button className="btn" type="submit">
        Submit
      </button>
      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </form>
  );
}

export default React.memo(CompleteOnboarding);
