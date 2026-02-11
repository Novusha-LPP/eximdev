import * as Yup from "yup";

export const validationSchema = Yup.object({
  department: Yup.string().required("Department is required"),
  last_date: Yup.string().required("Last date is required"),
  reason_for_leaving: Yup.string().required("Reason for leaving is required"),
  overall_job_satisfaction: Yup.number().required(
    "Overall job satisfaction is required"
  ),
  clarity_of_job_duties: Yup.number().required(
    "Clarity of job duties is required"
  ),
  opportunity_to_utilize_skills: Yup.number().required(
    "Opportunity to utilize skills is required"
  ),
  workload_and_stress_management: Yup.number().required(
    "Workload and stress management is required"
  ),
  resources_and_tools_provided: Yup.number().required(
    "Resources and tools provided is required"
  ),
  quality_of_communication: Yup.string().required(
    "Quality of communication is required"
  ),
  support_from_manager: Yup.string().required(
    "Support from manager is required"
  ),
  appreciation_for_work: Yup.string().required(
    "Appreciation for work is required"
  ),
  collaboration_within_the_team: Yup.string().required(
    "Collaboration within the team is required"
  ),
  overall_company_culture: Yup.string().required(
    "Overall company culture is required"
  ),
  approach_of_reporting_manager: Yup.string().required(
    "Approach of reporting manager is required"
  ),
  opportunities_for_professional_development: Yup.number().required(
    "Opportunities for professional development is required"
  ),
  effectiveness_of_training_programs_provided: Yup.number().required(
    "Effectiveness of training programs provided is required"
  ),
  support_for_continuing_education: Yup.number().required(
    "Support for continuing education is required"
  ),
  recommend_this_company: Yup.string().required("Recommendation is required"),
  suggestions: Yup.string().required("Suggestions are required"),
});
