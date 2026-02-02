import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  Copy,
  Check,
  Building,
  Calendar,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageTransition from "@/components/PageTransition";

// CSV Schema definition
const csvSchema = {
  required: [
    { field: "name", description: "Nazwa atrakcji", example: "Zoo Warszawa" },
    { field: "city", description: "Miasto (klucz)", example: "warszawa" },
    { field: "type", description: "Typ atrakcji", example: "miejsce | wydarzenie" },
    { field: "age_range", description: "Zakres wiekowy", example: "3-12" },
    { field: "indoor_outdoor", description: "Lokalizacja", example: "indoor | outdoor | mixed" },
    { field: "short_description", description: "Krótki opis (max 500 znaków)", example: "Spotkanie z egzotycznymi zwierzętami..." },
    { field: "website_url", description: "Strona internetowa", example: "https://zoo.waw.pl" },
    { field: "location_hint", description: "Adres lub link do mapy", example: "ul. Ratuszowa 1/3, Warszawa" },
  ],
  optional: [
    { field: "date_from", description: "Data rozpoczęcia (dla wydarzeń)", example: "2026-03-15" },
    { field: "date_to", description: "Data zakończenia (dla wydarzeń)", example: "2026-03-17" },
    { field: "price_info", description: "Informacja o cenach", example: "Dorośli: 40 zł, Dzieci: 20 zł" },
    { field: "organizer_name", description: "Nazwa organizatora", example: "Fundacja Edukacji Dziecięcej" },
  ],
};

// Sample CSV content for display
const sampleCSV = `name,city,type,age_range,indoor_outdoor,short_description,website_url,location_hint,date_from,date_to
"Zoo Warszawa",warszawa,miejsce,2-12,outdoor,"Spotkanie z egzotycznymi zwierzętami",https://zoo.waw.pl,"ul. Ratuszowa 1/3, Warszawa",,
"Festiwal Bajek",warszawa,wydarzenie,3-10,outdoor,"Spektakle plenerowe dla dzieci",https://festiwalbajek.pl,"Park Skaryszewski",2026-03-15,2026-03-17`;

const Admin = () => {
  const [copiedCSV, setCopiedCSV] = useState(false);

  const handleCopyCSV = () => {
    navigator.clipboard.writeText(sampleCSV);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2000);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30">
        {/* Admin Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Wróć do aplikacji
                  </Button>
                </Link>
                <div className="h-6 w-px bg-border" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Panel administracyjny</h1>
                  <p className="text-xs text-muted-foreground">Zarządzanie danymi aplikacji</p>
                </div>
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                <AlertCircle className="w-3 h-3 mr-1" />
                Tryb deweloperski
              </Badge>
            </div>
          </div>
        </header>

        <main className="container py-8">
          {/* Page title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-serif text-foreground">Import atrakcji</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Dodaj wiele atrakcji jednocześnie, korzystając z pliku CSV. 
              Zaimportowane atrakcje przechodzą przez ten sam proces moderacji co zgłoszenia użytkowników.
            </p>
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Funkcja w przygotowaniu
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Import CSV jest obecnie w fazie projektowania. Poniżej znajdziesz specyfikację formatu danych, 
                  która zostanie użyta w finalnej implementacji.
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column - Schema */}
            <div className="lg:col-span-2 space-y-6">
              {/* Required fields */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    Pola wymagane
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Każdy wiersz w pliku CSV musi zawierać te pola
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Pole</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead className="w-[220px]">Przykład</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvSchema.required.map((item) => (
                      <TableRow key={item.field}>
                        <TableCell className="font-mono text-sm text-primary">
                          {item.field}
                        </TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {item.example}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Optional fields */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Pola opcjonalne
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dodatkowe dane wzbogacające wpis
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Pole</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead className="w-[220px]">Przykład</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvSchema.optional.map((item) => (
                      <TableRow key={item.field}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {item.field}
                        </TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {item.example}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Sample CSV */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Przykładowy plik CSV</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Użyj tego szablonu jako punktu wyjścia
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyCSV}
                    className="gap-2"
                  >
                    {copiedCSV ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Skopiowano
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Kopiuj
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre leading-relaxed">
                    {sampleCSV}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right column - Upload area */}
            <div className="space-y-6">
              {/* Upload placeholder */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Prześlij plik</h3>
                
                {/* Disabled upload zone */}
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/20 opacity-60 cursor-not-allowed">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Przeciągnij plik CSV lub kliknij, aby wybrać
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maksymalny rozmiar: 5 MB
                  </p>
                </div>

                {/* Disabled button */}
                <Button 
                  className="w-full mt-4 gap-2" 
                  disabled
                >
                  <Upload className="w-4 h-4" />
                  Upload CSV (coming soon)
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Funkcja będzie dostępna w przyszłej wersji
                </p>
              </div>

              {/* Import rules */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Zasady importu</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-muted-foreground">
                      Zaimportowane atrakcje mają tę samą strukturę co dodane ręcznie
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-muted-foreground">
                      Każda atrakcja podlega weryfikacji przed publikacją
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-muted-foreground">
                      Po imporcie można edytować pojedyncze wpisy
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-muted-foreground">
                      Duplikaty są wykrywane automatycznie
                    </span>
                  </li>
                </ul>
              </div>

              {/* Technical notes */}
              <div className="bg-muted/50 rounded-xl p-5">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Notatki techniczne
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• Kodowanie pliku: UTF-8</li>
                  <li>• Separator pól: przecinek (,)</li>
                  <li>• Teksty z przecinkami: w cudzysłowie ("")</li>
                  <li>• Pola opcjonalne: pozostaw puste</li>
                  <li>• Format daty: YYYY-MM-DD</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Admin;
