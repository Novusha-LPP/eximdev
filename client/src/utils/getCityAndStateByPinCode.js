import axios from "axios";

export const getCityAndStateByPinCode = async (pinCode) => {
  try {
    const response = await axios.get(
      `https://api.postalpincode.in/pincode/${pinCode}`,
      {
        maxRedirects: 5,
      }
    );
    if (
      response.data &&
      response.data[0].Status === "Success" &&
      response.data[0].PostOffice.length > 0
    ) {
      const postOffice = response.data[0].PostOffice[0];
      return {
        city: postOffice.District,
        state: postOffice.State,
      };
    } else {
      throw new Error("No data found for this pin code");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
};
