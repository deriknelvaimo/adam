import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { GeneticMarker } from "@shared/schema";

interface GeneticMarkersTableProps {
  markers: GeneticMarker[];
}

const getImpactColor = (impact: string) => {
  switch (impact.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    case 'pharmacogenetic':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function GeneticMarkersTable({ markers }: GeneticMarkersTableProps) {
  if (markers.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <i className="fas fa-table text-2xl text-gray-400 mb-2"></i>
          <p className="text-gray-600">No genetic markers to display</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="font-medium text-gray-900">Genetic Markers ({markers.length})</h4>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gene</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Genotype</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Clinical Significance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {markers.map((marker) => (
              <TableRow key={marker.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{marker.gene}</TableCell>
                <TableCell className="text-gray-600">{marker.variant}</TableCell>
                <TableCell className="text-gray-600">{marker.genotype}</TableCell>
                <TableCell>
                  <Badge className={getImpactColor(marker.impact)}>
                    {marker.impact}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 max-w-xs truncate">
                  {marker.clinicalSignificance}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
