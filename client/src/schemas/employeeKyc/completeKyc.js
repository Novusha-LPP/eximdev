import * as yup from "yup";

const emailRegex =
  /[a-zA-Z0-9_]+(\.)?[a-zA-Z0-9_]+[@]{1}[a-zA-Z]+\.[a-zA-Z]{2,6}/;
const mobileNumberRegex = /^[6-9]\d{9}$/;
const aadharNumberRegex = /^\d{12}$/;
const panNumberRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
const pinCodeRegex = /^\d{6}$/;

export const validationSchema = yup.object({
  designation: yup
    .string("Enter designation")
    .required("Designation is required"),
  department: yup.string("Enter department").required("Department is required"),
  joining_date: yup
    .string("Enter joining date")
    .required("Joining date is required"),
  dob: yup.string("Enter date of birth").required("Date of birth is required"),
  permanent_address_line_1: yup
    .string("Enter address line 1")
    .required("Address line 1 is required"),
  permanent_address_line_2: yup
    .string("Enter address line 2")
    .required("Address line 2 is required"),
  permanent_address_city: yup.string("Enter city").required("City is required"),
  permanent_address_area: yup.string("Enter area").required("Area is required"),
  permanent_address_state: yup
    .string("Enter state")
    .required("State is required"),
  permanent_address_pincode: yup
    .string("Enter pincode")
    .required("Pincode is required")
    .matches(pinCodeRegex, "Invalid pincode"),
  communication_address_line_1: yup
    .string("Enter address line 1")
    .required("Address line 1 is required"),
  communication_address_line_2: yup
    .string("Enter address line 2")
    .required("Address line 2 is required"),
  communication_address_city: yup
    .string("Enter city")
    .required("City is required"),
  communication_address_area: yup
    .string("Enter area")
    .required("Area is required"),
  communication_address_state: yup
    .string("Enter state")
    .required("State is required"),
  communication_address_pincode: yup
    .string("Enter pincode")
    .required("Pincode is required")
    .matches(pinCodeRegex, "Invalid pincode"),
  personal_email: yup
    .string()
    .email("Invalid email")
    .required("Please enter personal email")
    .matches(emailRegex, "Invalid personal email"),
  official_email: yup
    .string()
    .email("Invalid email")
    .matches(emailRegex, "Invalid official email"),
  mobile: yup
    .string("Enter mobile number")
    .required("Mobile number is required")
    .matches(mobileNumberRegex, "Invalid mobile"),
  emergency_contact: yup
    .string("Enter emergency contact")
    .required("Emergency contact is required")
    .matches(mobileNumberRegex, "Invalid emergency contact"),
  emergency_contact_name: yup
    .string("Enter emergency contact name")
    .required("Emergency contact name is required"),
  family_members: yup
    .array()
    .of(yup.string())
    .min(1, "At least one family member is required")
    .required("Family members are required"),
  close_friend_contact_no: yup
    .string("Enter close friend contact no")
    .required("Close friend contact no is required")
    .matches(mobileNumberRegex, "Invalid close friend contact no"),
  close_friend_contact_name: yup
    .string("Enter close friend contact name")
    .required("Close friend contact name is required"),
  blood_group: yup
    .string("Enter blood group")
    .required("Blood group is required"),
  highest_qualification: yup
    .string("Enter highest qualification")
    .required("Highest qualification is required"),
  aadhar_no: yup
    .string("Enter aadhar no")
    .required("Aadhar no is required")
    .matches(aadharNumberRegex, "Invalid aadhar no"),
  aadhar_photo_front: yup
    .string("Enter aadhar photo front")
    .required("Aadhar photo front is required"),
  aadhar_photo_back: yup
    .string("Enter aadhar photo back")
    .required("Aadhar photo back is required"),
  pan_no: yup
    .string("Enter pan no")
    .required("Pan no is required")
    .matches(panNumberRegex, "Invalid pan no"),
  pan_photo: yup.string("Enter pan photo").required("Pan photo is required"),
  insurance_status: yup
    .array()
    .of(yup.string())
    .min(1, "At least one insurance status is required")
    .required("Insurance status is required"),
  bank_account_no: yup
    .string("Enter bank account no")
    .required("Bank account no is required"),
  bank_name: yup.string("Enter bank name").required("Bank name is required"),
  ifsc_code: yup.string("Enter IFSC code").required("IFSC code is required"),
  favorite_song: yup
    .string("Enter favorite song")
    .required("Favorite song is required"),
  marital_status: yup
    .string("Enter marital status")
    .required("Marital status is required"),
});
