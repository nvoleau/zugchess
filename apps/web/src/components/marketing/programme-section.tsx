import { getTranslations } from "next-intl/server";

interface Family {
  num: string;
  name: string;
  themes: string;
  count: string;
  free: string;
  glyph: string;
}

export async function ProgrammeSection() {
  const t = await getTranslations("Marketing.programme");
  const families = t.raw("families") as Family[];

  return (
    <section id="programme" className="bg-brand-paper text-brand-paperInk">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-16 sm:px-10 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h2 className="max-w-[700px] text-balance font-brandSerif text-[clamp(40px,5.5vw,68px)] font-normal leading-none tracking-tight">
            {t("title")}
          </h2>
          <p className="max-w-[360px] text-base leading-relaxed text-[#55504A]">{t("body")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((family, i) => {
            const dark = i % 2 === 1;
            return (
              <div
                key={family.num}
                className={`flex min-h-[230px] flex-col gap-3.5 rounded-[22px] p-[26px] ${dark ? "bg-brand-paperInk text-brand-cream" : "bg-white text-brand-paperInk"}`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span
                    className={`rounded-full border-[1.5px] px-3.5 py-0.5 font-brandMono text-[15px] ${dark ? "border-brand-cream" : "border-brand-paperInk"}`}
                  >
                    {family.num}
                  </span>
                  <span className="text-3xl leading-none">{family.glyph}</span>
                </div>
                <h3 className="text-[21px] font-medium">{family.name}</h3>
                <p className="flex-1 text-sm leading-relaxed opacity-[0.78]">{family.themes}</p>
                <div
                  className={`flex justify-between border-t pt-3 font-brandMono text-xs ${dark ? "border-white/[0.15]" : "border-black/[0.12]"}`}
                >
                  <span>
                    {family.count} {t("positionsLabel")}
                  </span>
                  <span>{family.free}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
