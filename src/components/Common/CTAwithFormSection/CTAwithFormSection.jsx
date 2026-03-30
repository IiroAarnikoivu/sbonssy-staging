import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import { useTranslations } from "next-intl";

export default function CTAwithFormSection({ data }) {
  const t = useTranslations();
  return (
    <>
      <section
        className="bg-cover bg-center bg-no-repeat after:w-screen after:h-screen after:bg-black/50 after:absolute after:top-0 after:left-0 overflow-hidden relative"
        style={{ backgroundImage: `url('${data.bgImage}')` }}
      >
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          <div className="text-white lg:max-w-[768px] relative z-20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 w-[70%]">
              {data.heading}
            </h2>
            <p className="mb-6 text-sm lg:text-base">{data.description}</p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:max-w-[513px]">
              <input
                type="email"
                placeholder={data.placeholder}
                className="defaultInput text-left pl-3 w-full"
              />
              <button className="primaryBtnPlain text-nowrap w-full lg:w-fit">
                {data.buttonText}
              </button>
            </div>

            <p className="text-xs mt-4">
              {data.disclaimer} <a href="/privacy-policy">{t("Blog.terms")}</a>{" "}
              {data.text}
            </p>
          </div>
        </DefaultLayout>
      </section>
    </>
  );
}
