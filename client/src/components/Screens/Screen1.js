import React from "react";
import "../../styles/Screens.scss";
import { screenData } from "./data";

const Screen1 = () => {
    return (
      <div className="screen">
        {screenData.screen1.map((item, index) => (
          <div className="box" key={index}>
            <p className="title">{item.title}</p>
            <p className="count">{item.count}</p>
          </div>
        ))}
      </div>
    );
  };
  
  export default Screen1;
