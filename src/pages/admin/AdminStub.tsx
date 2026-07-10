interface Props {
  title: string;
}

const AdminStub = ({ title }: Props) => (
  <div className="bg-card border border-border rounded-lg p-10 text-center">
    <h2 className="text-lg font-semibold mb-2">{title}</h2>
    <p className="text-sm text-muted-foreground">
      Ta zakładka zostanie wypełniona w kolejnych krokach.
    </p>
  </div>
);

export default AdminStub;