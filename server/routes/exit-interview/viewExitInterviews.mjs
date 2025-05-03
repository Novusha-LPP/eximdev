import express from "express";
import ExitInterviewModel from "../../model/exitInterviewModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/view-exit-interviews", authenticateJWT, async (req, res) => {
  try {
    const data = await ExitInterviewModel.find({});

    const structuredData = data.map((item) => {
      const jobSatisfaction =
        (item.overall_job_satisfaction +
          item.clarity_of_job_duties +
          item.opportunity_to_utilize_skills +
          item.workload_and_stress_management +
          item.resources_and_tools_provided) /
        5;

      const trainingAndDevelopment =
        (item.opportunities_for_professional_development +
          item.effectiveness_of_training_programs_provided +
          item.support_for_continuing_education) /
        3;

      return {
        _id: item._id,
        employee_name: item.employee_name,
        company: item.company,
        department: item.department,
        last_date: item.last_date,
        job_satisfaction: jobSatisfaction,
        support_from_manager: item.support_from_manager,
        approach_of_reporting_manager: item.approach_of_reporting_manager,
        overall_company_culture: item.overall_company_culture,
        training_and_development: trainingAndDevelopment,
        suggestions: item.suggestions,
      };
    });

    res.status(200).json(structuredData);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

export default router;
