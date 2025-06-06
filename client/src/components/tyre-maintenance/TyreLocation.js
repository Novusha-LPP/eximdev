import React from "react";
// import fiveWheel from "../../assets/images/5-wheel.webp";
import tenWheel from "../../assets/images/10-wheel.webp";
import twelveWheel from "../../assets/images/12-wheel.webp";
import forteenWheel from "../../assets/images/14-wheel.webp";
import eighteenWheel from "../../assets/images/18-wheel.webp";

function TyreLocation(props) {
  const truck_type = props.formik.values.truck_type;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "50px 0",
      }}
    >
      {
        // truck_type === "5 Wheel" ? (
        // <div>
        //   <img src={fiveWheel} useMap="#image-map" alt="5 wheel" />

        //   <map name="image-map">
        //     <area
        //       target=""
        //       alt=""
        //       title=""
        //       href=""
        //       coords="64,292,40,216"
        //       shape="rect"
        //       onClick={(e) => {
        //         e.preventDefault();
        //         props.handleLocation("FL");
        //       }}
        //     />
        //     <area
        //       target=""
        //       alt=""
        //       title=""
        //       href=""
        //       coords="205,291,180,215"
        //       shape="rect"
        //       onClick={(e) => {
        //         e.preventDefault();
        //         props.handleLocation("FR");
        //       }}
        //     />
        //     <area
        //       target=""
        //       alt=""
        //       title=""
        //       href=""
        //       coords="63,487,40,413"
        //       shape="rect"
        //       onClick={(e) => {
        //         e.preventDefault();
        //         props.handleLocation("P-A1-L");
        //       }}
        //     />
        //     <area
        //       target=""
        //       alt=""
        //       title=""
        //       href=""
        //       coords="203,488,181,413"
        //       shape="rect"
        //       onClick={(e) => {
        //         e.preventDefault();
        //         props.handleLocation("P-A1-R");
        //       }}
        //     />
        //     <area
        //       target=""
        //       alt=""
        //       title=""
        //       href=""
        //       coords="163,557,85,531"
        //       shape="rect"
        //       onClick={(e) => {
        //         e.preventDefault();
        //         props.handleLocation("SPARE");
        //       }}
        //     />
        //   </map>
        // </div>
        // ) :
        truck_type === "20 feet 10 wheels" ? (
          <div>
            <img src={tenWheel} useMap="#image-map-1" alt="10 wheel" />

            <map name="image-map-1">
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="26,440,4,375"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="38,374,61,441"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="177,439,156,374"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="189,374,211,439"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="6,210,26,274"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="39,210,60,274"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="155,210,177,275"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="190,211,211,274"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="5,96,33,181"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FL");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="201,183,172,93"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FR");
                }}
              />
            </map>
          </div>
        ) : truck_type === "20 feet 12 wheels" ? (
          <div>
            <img src={twelveWheel} useMap="#image-map-2" alt="12 wheel" />

            <map name="image-map-2">
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="38,579,17,515"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="51,516,71,579"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="168,513,189,579"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="202,515,223,579"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="15,350,36,415"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="50,350,70,414"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="166,350,188,414"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="200,350,221,415"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="15,188,37,252"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="200,185,222,250"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="15,71,43,157"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FL");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="210,155,183,70"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FR");
                }}
              />
            </map>
          </div>
        ) : truck_type === "20 feet 2-axle trailer" ||
          truck_type === "20 feet 2-axle tipper trailer" ||
          truck_type === "40 feet 2-axle trailer" ? (
          <div>
            <img src={forteenWheel} useMap="#image-map-3" alt="14 wheel" />

            <map name="image-map-3">
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="30,576,9,512"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="64,576,43,512"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="181,576,160,513"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="215,577,194,512"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="9,347,29,413"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="42,347,64,412"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="159,347,181,413"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="192,348,214,412"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="9,184,29,247"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="43,184,63,247"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="158,184,181,247"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="193,183,214,247"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="38,157,9,71"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FL");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="204,156,176,69"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FR");
                }}
              />
            </map>
          </div>
        ) : truck_type === "40 feet 3-axle trailer" ||
          truck_type === "40 feet 3-axle tipper trailer" ? (
          <div>
            <img src={eighteenWheel} useMap="#image-map-4" alt="18 wheel" />
            <map name="image-map-4">
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="5,632,29,560"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="42,631,66,560"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="168,631,192,561"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="205,560,229,632"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="6,535,30,467"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="43,535,66,467"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="169,466,193,537"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="206,465,230,538"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A2-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="5,283,29,357"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A3-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="41,284,67,357"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A3-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="167,285,193,357"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A3-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="205,286,231,356"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("T-A3-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="6,191,30,263"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-LO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="42,191,67,264"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-LI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="168,190,193,263"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-RI");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="206,190,231,262"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("P-A1-RO");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="16,58,46,148"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FL");
                }}
              />
              <area
                target=""
                alt=""
                title=""
                href=""
                coords="222,149,192,60"
                shape="rect"
                onClick={(e) => {
                  e.preventDefault();
                  props.handleLocation("FR");
                }}
              />
            </map>
          </div>
        ) : (
          ""
        )
      }
    </div>
  );
}

export default TyreLocation;
