"use client";

const BrandForm = ({ formik, renderStep, currentStep }) => {
  return (
    <div>
      <form onSubmit={formik.handleSubmit} className="formInputs">
        <div>{renderStep(currentStep)}</div>
      </form>
    </div>
  );
};

export default BrandForm;
