import React, { useContext, useState } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { MenuItem, TextField } from "@mui/material";
import Rating from "@mui/material/Rating";
import { UserContext } from "../contexts/UserContext";
import { validationSchema } from "../schemas/exitInterview/exitInterviewSchema";

// Compact Field Component
const Field = ({ label, children, fullWidth }) => (
  <div className={`hr-compact-field ${fullWidth ? 'full-width' : ''}`}>
    <label className="hr-field-label">{label}</label>
    {children}
  </div>
);

// Compact Rating Component
const RatingField = ({ label, name, value, formik }) => (
  <div className="hr-compact-rating">
    <span className="rating-label">{label}</span>
    <Rating
      name={name}
      value={value}
      size="small"
      onChange={(event, newValue) => formik.setFieldValue(name, newValue)}
    />
    {formik.touched[name] && formik.errors[name] && (
      <div style={{ color: '#d32f2f', fontSize: '0.7rem' }}>{formik.errors[name]}</div>
    )}
  </div>
);

function ExitInterviewForm() {
  const { user } = useContext(UserContext);
  const [submitted, setSubmitted] = useState(false);

  const formik = useFormik({
    initialValues: {
      department: "",
      last_date: "",
      reason_for_leaving: "",
      overall_job_satisfaction: 0,
      clarity_of_job_duties: 0,
      opportunity_to_utilize_skills: 0,
      workload_and_stress_management: 0,
      resources_and_tools_provided: 0,
      quality_of_communication: "",
      support_from_manager: "",
      appreciation_for_work: "",
      collaboration_within_the_team: "",
      overall_company_culture: "",
      approach_of_reporting_manager: "",
      opportunities_for_professional_development: 0,
      effectiveness_of_training_programs_provided: 0,
      support_for_continuing_education: 0,
      recommend_this_company: "",
      suggestions: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const employee_name = [user.first_name, user.middle_name, user.last_name]
        .filter(Boolean)
        .join(" ");
      const company = user.company;

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/add-exit-interview`,
        { ...values, employee_name, company }
      );
      alert(res.data.message);
      setSubmitted(true);
      resetForm();
    },
  });



  if (submitted) {
    return (
      <div className="hr-compact-section" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '2rem', color: 'var(--hr-success)', marginBottom: '12px' }}>✓</div>
        <h3 style={{ color: 'var(--hr-text-primary)', marginBottom: '8px' }}>Thank You!</h3>
        <p style={{ color: 'var(--hr-text-secondary)', fontSize: '0.85rem' }}>Your feedback has been submitted successfully.</p>
        <button className="hr-compact-btn hr-compact-btn-secondary" onClick={() => setSubmitted(false)} style={{ marginTop: '16px' }}>
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Two Column Layout */}
      <div className="hr-compact-layout">
        {/* LEFT COLUMN */}
        <div>
          {/* Basic Information */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Basic Information</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-2">
                <Field label="Department">
                  <TextField size="small" variant="filled" fullWidth name="department" value={formik.values.department} onChange={formik.handleChange} error={formik.touched.department && Boolean(formik.errors.department)} helperText={formik.touched.department && formik.errors.department} className="hr-quick-input" placeholder="Enter department" />
                </Field>
                <Field label="Last Working Day">
                  <TextField type="date" size="small" variant="filled" fullWidth name="last_date" value={formik.values.last_date} onChange={formik.handleChange} error={formik.touched.last_date && Boolean(formik.errors.last_date)} helperText={formik.touched.last_date && formik.errors.last_date} className="hr-quick-input" InputLabelProps={{ shrink: true }} />
                </Field>
              </div>
              <div className="hr-compact-grid cols-1" style={{ marginTop: '8px' }}>
                <Field label="Reason for Leaving">
                  <TextField select size="small" variant="filled" fullWidth name="reason_for_leaving" value={formik.values.reason_for_leaving} onChange={formik.handleChange} error={formik.touched.reason_for_leaving && Boolean(formik.errors.reason_for_leaving)} helperText={formik.touched.reason_for_leaving && formik.errors.reason_for_leaving} className="hr-quick-input">
                    <MenuItem value="">Select reason</MenuItem>
                    <MenuItem value="New opportunity">New Opportunity</MenuItem>
                    <MenuItem value="Returning to institute">Returning to Institute</MenuItem>
                    <MenuItem value="Relocation">Relocation</MenuItem>
                    <MenuItem value="Retirement">Retirement</MenuItem>
                    <MenuItem value="Compensation & Benefits">Compensation & Benefits</MenuItem>
                    <MenuItem value="Work-life balance">Work-Life Balance</MenuItem>
                    <MenuItem value="Management style">Management Style</MenuItem>
                    <MenuItem value="Development opportunities">Development Opportunities</MenuItem>
                    <MenuItem value="Company culture">Company Culture</MenuItem>
                  </TextField>
                </Field>
              </div>
            </div>
          </div>

          {/* Job Role Satisfaction */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Job Role Satisfaction</div>
            <div className="hr-section-body">
              <RatingField label="Overall Job Satisfaction" name="overall_job_satisfaction" value={formik.values.overall_job_satisfaction} formik={formik} />
              <RatingField label="Clarity of Job Duties" name="clarity_of_job_duties" value={formik.values.clarity_of_job_duties} formik={formik} />
              <RatingField label="Opportunity to Utilize Skills" name="opportunity_to_utilize_skills" value={formik.values.opportunity_to_utilize_skills} formik={formik} />
              <RatingField label="Workload & Stress Management" name="workload_and_stress_management" value={formik.values.workload_and_stress_management} formik={formik} />
              <RatingField label="Resources & Tools Provided" name="resources_and_tools_provided" value={formik.values.resources_and_tools_provided} formik={formik} />
            </div>
          </div>

          {/* Training & Development */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Training & Development</div>
            <div className="hr-section-body">
              <RatingField label="Professional Development" name="opportunities_for_professional_development" value={formik.values.opportunities_for_professional_development} formik={formik} />
              <RatingField label="Training Programs" name="effectiveness_of_training_programs_provided" value={formik.values.effectiveness_of_training_programs_provided} formik={formik} />
              <RatingField label="Continuing Education Support" name="support_for_continuing_education" value={formik.values.support_for_continuing_education} formik={formik} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Management & Team */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Management & Team Environment</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-2">
                <Field label="Quality of Communication">
                  <TextField size="small" variant="filled" fullWidth name="quality_of_communication" value={formik.values.quality_of_communication} onChange={formik.handleChange} error={formik.touched.quality_of_communication && Boolean(formik.errors.quality_of_communication)} helperText={formik.touched.quality_of_communication && formik.errors.quality_of_communication} className="hr-quick-input" />
                </Field>
                <Field label="Support from Manager">
                  <TextField size="small" variant="filled" fullWidth name="support_from_manager" value={formik.values.support_from_manager} onChange={formik.handleChange} error={formik.touched.support_from_manager && Boolean(formik.errors.support_from_manager)} helperText={formik.touched.support_from_manager && formik.errors.support_from_manager} className="hr-quick-input" />
                </Field>
                <Field label="Appreciation for Work">
                  <TextField size="small" variant="filled" fullWidth name="appreciation_for_work" value={formik.values.appreciation_for_work} onChange={formik.handleChange} error={formik.touched.appreciation_for_work && Boolean(formik.errors.appreciation_for_work)} helperText={formik.touched.appreciation_for_work && formik.errors.appreciation_for_work} className="hr-quick-input" />
                </Field>
                <Field label="Team Collaboration">
                  <TextField size="small" variant="filled" fullWidth name="collaboration_within_the_team" value={formik.values.collaboration_within_the_team} onChange={formik.handleChange} error={formik.touched.collaboration_within_the_team && Boolean(formik.errors.collaboration_within_the_team)} helperText={formik.touched.collaboration_within_the_team && formik.errors.collaboration_within_the_team} className="hr-quick-input" />
                </Field>
                <Field label="Company Culture">
                  <TextField size="small" variant="filled" fullWidth name="overall_company_culture" value={formik.values.overall_company_culture} onChange={formik.handleChange} error={formik.touched.overall_company_culture && Boolean(formik.errors.overall_company_culture)} helperText={formik.touched.overall_company_culture && formik.errors.overall_company_culture} className="hr-quick-input" />
                </Field>
                <Field label="Manager's Approach">
                  <TextField select size="small" variant="filled" fullWidth name="approach_of_reporting_manager" value={formik.values.approach_of_reporting_manager} onChange={formik.handleChange} error={formik.touched.approach_of_reporting_manager && Boolean(formik.errors.approach_of_reporting_manager)} helperText={formik.touched.approach_of_reporting_manager && formik.errors.approach_of_reporting_manager} className="hr-quick-input">
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Proactive and supportive">Proactive & Supportive</MenuItem>
                    <MenuItem value="Micromanaging and controlling">Micromanaging</MenuItem>
                    <MenuItem value="Provided clear direction but lacked support">Clear Direction, Lacked Support</MenuItem>
                  </TextField>
                </Field>
              </div>
            </div>
          </div>

          {/* Final Feedback */}
          <div className="hr-compact-section">
            <div className="hr-section-header">Final Feedback</div>
            <div className="hr-section-body">
              <div className="hr-compact-grid cols-1">
                <Field label="Would you recommend this company?">
                  <TextField select size="small" variant="filled" fullWidth name="recommend_this_company" value={formik.values.recommend_this_company} onChange={formik.handleChange} error={formik.touched.recommend_this_company && Boolean(formik.errors.recommend_this_company)} helperText={formik.touched.recommend_this_company && formik.errors.recommend_this_company} className="hr-quick-input" style={{ maxWidth: '200px' }}>
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </TextField>
                </Field>
                <Field label="Suggestions for Improvement" fullWidth>
                  <TextField size="small" variant="filled" fullWidth multiline rows={3} name="suggestions" value={formik.values.suggestions} onChange={formik.handleChange} error={formik.touched.suggestions && Boolean(formik.errors.suggestions)} helperText={formik.touched.suggestions && formik.errors.suggestions} className="hr-quick-input" placeholder="Share your suggestions..." />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="hr-btn-row">
        <button type="submit" className="hr-compact-btn hr-compact-btn-primary">
          Submit Feedback
        </button>
      </div>
    </form>
  );
}

export default ExitInterviewForm;
