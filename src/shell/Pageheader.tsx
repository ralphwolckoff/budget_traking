interface Props {
  title: string;
  subtitle: string;
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-6">
      <h2 className="text-[1.4rem] font-extrabold text-text m-0 mb-1 tracking-tight">
        {title}
      </h2>
      <div className="text-[0.88rem] text-text-muted">{subtitle}</div>
    </div>
  );
}
