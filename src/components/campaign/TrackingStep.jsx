"use client";

const TrackingStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Tracking Setup
      </h2>

      <div>
        <label className="block mb-2 text-gray-700">Promo Code Prefix</label>
        <input
          type="text"
          name="tracking.promoCodePrefix"
          value={values.tracking.promoCodePrefix}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="BRAND20"
        />
        <p className="mt-1 text-sm text-gray-500">
          Creators will receive unique codes like{" "}
          {values.tracking.promoCodePrefix || "BRAND"}-JOHNDOE
        </p>
      </div>

      <div>
        <label className="block mb-2 text-gray-700">Landing Page URL*</label>
        <input
          type="url"
          name="tracking.landingPageUrl"
          value={values.tracking.landingPageUrl}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://example.com/summer-sale"
          required
        />
        {touched.tracking?.landingPageUrl &&
          errors.tracking?.landingPageUrl && (
            <p className="mt-1 text-sm text-red-600">
              {errors.tracking.landingPageUrl}
            </p>
          )}
      </div>

      <div>
        <label className="block mb-2 text-gray-700">Tracking Pixel</label>
        <textarea
          name="tracking.trackingPixel"
          value={values.tracking.trackingPixel}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          rows={4}
          placeholder="Paste your JavaScript tracking pixel code here"
        />
        <p className="mt-1 text-sm text-gray-500">
          This will be automatically added to your landing page
        </p>
      </div>

      <div>
        <label className="block mb-2 text-gray-700">
          Postback URL (Advanced)
        </label>
        <input
          type="url"
          name="tracking.postbackUrl"
          value={values.tracking.postbackUrl}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://example.com/webhook"
        />
        {touched.tracking?.postbackUrl && errors.tracking?.postbackUrl && (
          <p className="mt-1 text-sm text-red-600">
            {errors.tracking.postbackUrl}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          For server-to-server conversion tracking
        </p>
      </div>
    </div>
  );
};

export default TrackingStep;
