import React from "react";
import "../../styles/Screens.scss";
import { screenData } from "./data";

const Screen2 = () => {
  return (
    <div className="screen">
      {screenData.screen2.map((item, index) => (
        <div className="box" key={index}>
          <p className="title">{item.title}</p>
          <p className="count">{item.count}</p>
        </div>
      ))}
    </div>
  );
};

export default Screen2;
