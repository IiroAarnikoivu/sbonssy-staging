import React from "react";
import css from "./defaultLayout.module.css";

const DefaultLayout = ({ children, styling }) => {
  return <div className={`${styling} ${css.defaultLayout}`}>{children}</div>;
};

export default DefaultLayout;
