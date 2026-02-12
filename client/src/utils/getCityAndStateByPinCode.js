// Mock function to get city and state by PIN code
export const getCityAndStateByPinCode = async (pinCode) => {
  // Mock data - in production, you'd call a real API
  const mockData = {
    '110001': { city: 'New Delhi', state: 'Delhi' },
    '400001': { city: 'Mumbai', state: 'Maharashtra' },
    '600001': { city: 'Chennai', state: 'Tamil Nadu' },
    '700001': { city: 'Kolkata', state: 'West Bengal' },
    '560001': { city: 'Bangalore', state: 'Karnataka' },
    '500001': { city: 'Hyderabad', state: 'Telangana' },
    '411001': { city: 'Pune', state: 'Maharashtra' },
    '380001': { city: 'Ahmedabad', state: 'Gujarat' },
    '302001': { city: 'Jaipur', state: 'Rajasthan' },
    '226001': { city: 'Lucknow', state: 'Uttar Pradesh' },
  };

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return mockData[pinCode] || null;
};

// In a real application, you would call an actual PIN code API:
/*
export const getCityAndStateByPinCode = async (pinCode) => {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`);
    const data = await response.json();
    
    if (data && data[0] && data[0].Status === 'Success') {
      const postOffice = data[0].PostOffice[0];
      return {
        city: postOffice.District,
        state: postOffice.State
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching PIN code data:', error);
    return null;
  }
};
*/
