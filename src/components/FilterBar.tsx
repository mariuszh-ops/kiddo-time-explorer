import { MapPin, Users, Tag, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FilterBar = () => {
  return (
    <section className="bg-card border-b border-border sticky top-0 z-20">
      <div className="container py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          {/* City filter */}
          <Select>
            <SelectTrigger className="w-full md:w-[180px] bg-background">
              <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Miasto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="warszawa">Warszawa</SelectItem>
              <SelectItem value="krakow">Kraków</SelectItem>
              <SelectItem value="wroclaw">Wrocław</SelectItem>
              <SelectItem value="gdansk">Gdańsk</SelectItem>
              <SelectItem value="poznan">Poznań</SelectItem>
            </SelectContent>
          </Select>

          {/* Age filter */}
          <Select>
            <SelectTrigger className="w-full md:w-[160px] bg-background">
              <Users className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Wiek dziecka" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-2">0-2 lata</SelectItem>
              <SelectItem value="3-5">3-5 lat</SelectItem>
              <SelectItem value="6-9">6-9 lat</SelectItem>
              <SelectItem value="10-12">10-12 lat</SelectItem>
              <SelectItem value="13+">13+ lat</SelectItem>
            </SelectContent>
          </Select>

          {/* Activity type filter */}
          <Select>
            <SelectTrigger className="w-full md:w-[180px] bg-background">
              <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Typ aktywności" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zoo">Zoo i zwierzęta</SelectItem>
              <SelectItem value="muzeum">Muzea</SelectItem>
              <SelectItem value="plac-zabaw">Place zabaw</SelectItem>
              <SelectItem value="park">Parki</SelectItem>
              <SelectItem value="sport">Sport i ruch</SelectItem>
              <SelectItem value="warsztaty">Warsztaty</SelectItem>
            </SelectContent>
          </Select>

          {/* Indoor/Outdoor filter */}
          <Select>
            <SelectTrigger className="w-full md:w-[160px] bg-background">
              <Home className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Lokalizacja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="indoor">W pomieszczeniu</SelectItem>
              <SelectItem value="outdoor">Na zewnątrz</SelectItem>
            </SelectContent>
          </Select>

          {/* Search button */}
          <Button className="w-full md:w-auto md:ml-auto" variant="default">
            Szukaj
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
