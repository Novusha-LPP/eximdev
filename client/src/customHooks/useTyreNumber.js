import { useState, useEffect } from "react";
import axios from "axios";

function useTyreNumber() {
  const [tyreNo, setTyreNo] = useState([]);

  useEffect(() => {
    async function getTyreNumber() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-tyre-nos`
      );
      setTyreNo(res.data);
    }

    getTyreNumber();
  }, []);

  return { tyreNo, setTyreNo };
}

export default useTyreNumber;
