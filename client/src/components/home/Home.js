import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../../contexts/UserContext";
import { Row, Col } from "react-bootstrap";
import "../../styles/home.scss";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { navigateToModule } from "../../utils/navigateToModule.js";
import { moduleCategories } from "../../utils/moduleCategories.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";

const importPriority = [
  "Import - DSR",
  "e-Sanchit",
  "Documentation",
  "Submission",
  "Import - DO",
  "Import - Operations",
  "Import - Add",
  "Import - Billing",
  "Import Utility Tool",
];

function Home() {
  const { user } = useContext(UserContext);
  const [data, setData] = useState();
  const navigate = useNavigate();
  
  // Get search context functions to clear all search state
  const {
    setSearchQuery,
    setDetailedStatus,
    setSelectedICD,
    setSelectedImporter
  } = useSearchQuery();

  // Clear all search queries when visiting the home page
  useEffect(() => {
    setSearchQuery("");
    setDetailedStatus("all");
    setSelectedICD("all");
    setSelectedImporter("");
  }, [setSearchQuery, setDetailedStatus, setSelectedICD, setSelectedImporter]);

  useEffect(() => {
    async function getUser() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-user/${user.username}`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }

    getUser();
  }, [user]);

  const categorizedModules = data?.modules?.reduce((acc, module) => {
    const category = moduleCategories[module] || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {});

  const sortImports = (modules) => {
    return modules.sort((a, b) => {
      const indexA = importPriority.indexOf(a);
      const indexB = importPriority.indexOf(b);
      return indexA - indexB;
    });
  };

  return (
    <div>
      {categorizedModules &&
        Object.keys(categorizedModules)
          .sort()
          .map((category, idx) => (
            <div key={idx}>
              <br />
              <h6 style={{ marginBottom: 0, color: "#5B5E5F" }}>
                <strong>{category}</strong>
              </h6>
              <hr style={{ margin: "5px 0" }} />
              <Row>
                {(category === "DSR Module"
                  ? sortImports(categorizedModules[category])
                  : categorizedModules[category].sort()
                ).map((module, id) => (
                  <Col xs={12} md={4} lg={2} key={id} className="module-col">
                    <div
                      className="module-col-inner"
                      onClick={() => navigateToModule(module, navigate)}
                    >
                      <p>{module}</p>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
    </div>
  );
}

export default React.memo(Home);
