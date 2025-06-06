import mongoose from "mongoose";

const ExitInterviewSchema = new mongoose.Schema({
  employee_name: String,
  company: String,
  department: String,
  last_date: String,
  reason_for_leaving: String,
  overall_job_satisfaction: Number,
  clarity_of_job_duties: Number,
  opportunity_to_utilize_skills: Number,
  workload_and_stress_management: Number,
  resources_and_tools_provided: Number,
  quality_of_communication: String,
  support_from_manager: String,
  appreciation_for_work: String,
  collaboration_within_the_team: String,
  overall_company_culture: String,
  approach_of_reporting_manager: String,
  opportunities_for_professional_development: Number,
  effectiveness_of_training_programs_provided: Number,
  support_for_continuing_education: Number,
  recommend_this_company: String,
  suggestions: String,
});

const ExitInterviewModel = new mongoose.model(
  "ExitInterview",
  ExitInterviewSchema
);
export default ExitInterviewModel;
