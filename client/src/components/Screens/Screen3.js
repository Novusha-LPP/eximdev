import React from "react";
import "../../styles/Screens.scss";
import { screenData } from "./data";

const Screen3 = () => {
    return (
      <div className="screen">
        {screenData.screen3.map((item, index) => (
          <div className="box" key={index}>
            <p className="title">{item.title}</p>
            <p className="count">{item.count}</p>
          </div>
        ))}
      </div>
    );
  };
  
  export default Screen3;
