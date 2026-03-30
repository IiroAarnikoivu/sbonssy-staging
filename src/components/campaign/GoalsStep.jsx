"use client";

const GoalsStep = ({ values, errors, touched, handleChange, handleBlur }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Campaign Goals (Optional)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div>
          <label className="block mb-2 text-gray-700">Target Clicks</label>
          <input
            type="number"
            name="goals.clicks"
            value={values.goals.clicks}
            onChange={handleChange}
            onBlur={handleBlur}
          className="forms w-full border p-2 rounded"
            placeholder="10000"
            min="0"
          />
          {touched.goals?.clicks && errors.goals?.clicks && (
            <p className="mt-1 text-sm text-red-600">{errors.goals.clicks}</p>
          )}
        </div>
        <div>
          <label className="block mb-2 text-gray-700">Target Sales ($)</label>
          <input
            type="number"
            name="goals.sales"
            value={values.goals.sales}
            onChange={handleChange}
            onBlur={handleBlur}
            className="forms w-full border p-2 rounded"
            placeholder="5000"
            min="0"
          />
          {touched.goals?.sales && errors.goals?.sales && (
            <p className="mt-1 text-sm text-red-600">{errors.goals.sales}</p>
          )}
        </div>
        <div className="mt-6 ">
          <label className="block mb-2 text-gray-700">Target Signups</label>
          <input
            type="number"
            name="goals.signups"
            value={values.goals.signups}
            onChange={handleChange}
            onBlur={handleBlur}
           className="forms w-full border p-2 rounded"
            placeholder="100"
            min="0"
          />
          {touched.goals?.signups && errors.goals?.signups && (
            <p className="mt-1 text-sm text-red-600">{errors.goals.signups}</p>
          )}
        </div>
        <div className="mt-6 ">
          <label className="block mb-2 text-gray-700">Maximum Budget ($)</label>
          <input
            type="number"
            name="goals.budgetCap"
            value={values.goals.budgetCap}
            onChange={handleChange}
            onBlur={handleBlur}
            className="forms w-full border p-2 rounded"
            placeholder="10000"
            min="0"
          />
          {touched.goals?.budgetCap && errors.goals?.budgetCap && (
            <p className="mt-1 text-sm text-red-600">
              {errors.goals.budgetCap}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalsStep;
