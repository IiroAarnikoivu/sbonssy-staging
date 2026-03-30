"use client";
import React from "react";

/**
 * Wrapper form for non-brand onboarding flow.
 * @param {Object} props
 * @param {import('formik').FormikProps<any>} props.formik
 * @param {(step:number)=>React.ReactNode} props.renderStep
 * @param {number} props.currentStep
 */
const NonBrandForm = ({ formik, renderStep, currentStep }) => {
  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      <div>{renderStep(currentStep)}</div>
    </form>
  );
};

export default NonBrandForm;
