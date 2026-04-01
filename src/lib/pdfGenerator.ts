import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ServiceOrder } from './supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const generateOSPDF = (os: ServiceOrder) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(21, 22, 25);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ClinicOps', 20, 25);
  
  doc.setFontSize(10);
  doc.text('SISTEMA DE GESTÃO HOSPITALAR', 20, 32);
  
  doc.setFontSize(16);
  doc.text(`OS #${os.os_number}`, pageWidth - 60, 25);

  // Content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DA ORDEM DE SERVIÇO', 20, 55);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 58, pageWidth - 20, 58);

  const details = [
    ['Título:', os.title],
    ['Status:', os.status],
    ['Prioridade:', os.priority],
    ['Setor Destino:', os.target_sector_type],
    ['Solicitante:', os.requester?.full_name || 'N/A'],
    ['Técnico:', os.technician?.full_name || 'Não atribuído'],
    ['Data Abertura:', format(new Date(os.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })],
    ['Equipamento:', os.equipment?.name || 'N/A'],
    ['Patrimônio:', os.asset_tag || os.equipment?.asset_tag || 'N/A'],
    ['Localização:', os.location_detail || 'N/A'],
  ];

  (doc as any).autoTable({
    startY: 65,
    head: [],
    body: details,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO DO PROBLEMA', 20, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const splitDescription = doc.splitTextToSize(os.description, pageWidth - 40);
  doc.text(splitDescription, 20, finalY + 7);

  const resolutionY = finalY + 15 + (splitDescription.length * 5);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESOLUÇÃO TÉCNICA', 20, resolutionY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Defeito Constatado:', 20, resolutionY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(os.diagnosis || '__________________________________________________________________', 20, resolutionY + 17);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Ação Realizada:', 20, resolutionY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(os.solution || '__________________________________________________________________', 20, resolutionY + 37);

  // Signatures
  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.line(20, footerY, 90, footerY);
  doc.text('Assinatura do Técnico', 35, footerY + 5);
  
  doc.line(pageWidth - 90, footerY, pageWidth - 20, footerY);
  doc.text('Assinatura do Solicitante', pageWidth - 75, footerY + 5);

  doc.save(`OS_${os.os_number}.pdf`);
};

export const generateReportPDF = (title: string, data: any[], columns: string[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(21, 22, 25);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('ClinicOps - Relatório', 20, 20);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(title, 20, 45);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 52);

  (doc as any).autoTable({
    startY: 60,
    head: [columns],
    body: data,
    headStyles: { fillColor: [21, 22, 25] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`Relatorio_${title.replace(/\s+/g, '_')}.pdf`);
};
