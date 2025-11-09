import PDFDocument from 'pdfkit';
import logger from '../utils/logger.js';

/**
 * Generate a professional CV PDF
 * @param {Object} cv - CV document from database
 * @param {Object} res - Express response object to stream PDF
 */
export function generateCVPDF(cv, res) {
  try {
    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Set response headers
    const userName = cv.personalInfo?.fullName || 'CV';
    const sanitizedName = userName.replace(/[^a-z0-9]/gi, '_');
    const filename = `CV_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Color scheme
    const colors = {
      primary: '#2C3E50',
      secondary: '#3498DB',
      text: '#2C3E50',
      lightGray: '#95A5A6',
      divider: '#BDC3C7'
    };

    let yPosition = 50;

    // ===== HEADER SECTION =====
    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor(colors.primary)
       .text(cv.personalInfo?.fullName || 'CURRICULUM VITAE', 50, yPosition);

    yPosition += 40;

    // Contact information
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.text);

    if (cv.personalInfo?.email) {
      doc.text(`Email: ${cv.personalInfo.email}`, 50, yPosition);
      yPosition += 15;
    }

    if (cv.personalInfo?.phone) {
      doc.text(`Teléfono: ${cv.personalInfo.phone}`, 50, yPosition);
      yPosition += 15;
    }

    if (cv.personalInfo?.location) {
      doc.text(`Ubicación: ${cv.personalInfo.location}`, 50, yPosition);
      yPosition += 15;
    }

    if (cv.personalInfo?.linkedin) {
      doc.fillColor(colors.secondary)
         .text(cv.personalInfo.linkedin, 50, yPosition, {
           link: cv.personalInfo.linkedin,
           underline: true
         });
      yPosition += 15;
    }

    if (cv.personalInfo?.portfolio) {
      doc.fillColor(colors.secondary)
         .text(cv.personalInfo.portfolio, 50, yPosition, {
           link: cv.personalInfo.portfolio,
           underline: true
         });
      yPosition += 15;
    }

    yPosition += 10;

    // Divider
    doc.moveTo(50, yPosition)
       .lineTo(545, yPosition)
       .strokeColor(colors.divider)
       .stroke();

    yPosition += 20;

    // ===== PROFESSIONAL SUMMARY =====
    if (cv.professionalSummary) {
      addSection(doc, 'RESUMEN PROFESIONAL', yPosition, colors);
      yPosition += 35;

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(colors.text)
         .text(cv.professionalSummary, 50, yPosition, {
           width: 495,
           align: 'justify'
         });

      yPosition += doc.heightOfString(cv.professionalSummary, { width: 495 }) + 20;
    }

    // Check if we need a new page
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    // ===== EXPERIENCE =====
    if (cv.experience && cv.experience.length > 0) {
      addSection(doc, 'EXPERIENCIA PROFESIONAL', yPosition, colors);
      yPosition += 35;

      cv.experience.forEach((exp, index) => {
        // Check page break
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        // Job title and company
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(colors.primary)
           .text(exp.title || 'Cargo', 50, yPosition);

        yPosition += 15;

        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(colors.secondary)
           .text(exp.company || 'Empresa', 50, yPosition);

        yPosition += 15;

        // Dates
        if (exp.startDate || exp.endDate || exp.current) {
          const startDate = exp.startDate ? new Date(exp.startDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '';
          const endDate = exp.current ? 'Presente' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '');

          doc.font('Helvetica')
             .fontSize(9)
             .fillColor(colors.lightGray)
             .text(`${startDate}${startDate && endDate ? ' - ' : ''}${endDate}`, 50, yPosition);

          yPosition += 15;
        }

        // Description
        if (exp.description) {
          doc.font('Helvetica')
             .fontSize(10)
             .fillColor(colors.text)
             .text(exp.description, 50, yPosition, {
               width: 495,
               align: 'justify'
             });

          yPosition += doc.heightOfString(exp.description, { width: 495 }) + 15;
        }

        yPosition += 10;
      });

      yPosition += 10;
    }

    // ===== EDUCATION =====
    if (cv.education && cv.education.length > 0) {
      // Check page break
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      addSection(doc, 'FORMACIÓN ACADÉMICA', yPosition, colors);
      yPosition += 35;

      cv.education.forEach((edu, index) => {
        // Check page break
        if (yPosition > 680) {
          doc.addPage();
          yPosition = 50;
        }

        // Degree
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(colors.primary)
           .text(edu.degree || 'Título', 50, yPosition);

        yPosition += 15;

        // Institution
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(colors.secondary)
           .text(edu.institution || 'Institución', 50, yPosition);

        yPosition += 15;

        // Dates
        if (edu.startDate || edu.endDate) {
          const startDate = edu.startDate ? new Date(edu.startDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '';
          const endDate = edu.endDate ? new Date(edu.endDate).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '';

          doc.font('Helvetica')
             .fontSize(9)
             .fillColor(colors.lightGray)
             .text(`${startDate}${startDate && endDate ? ' - ' : ''}${endDate}`, 50, yPosition);

          yPosition += 15;
        }

        // Description
        if (edu.description) {
          doc.font('Helvetica')
             .fontSize(10)
             .fillColor(colors.text)
             .text(edu.description, 50, yPosition, { width: 495 });

          yPosition += doc.heightOfString(edu.description, { width: 495 }) + 10;
        }

        yPosition += 10;
      });

      yPosition += 10;
    }

    // ===== SKILLS =====
    if (cv.skills && cv.skills.length > 0) {
      // Check page break
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      addSection(doc, 'HABILIDADES', yPosition, colors);
      yPosition += 35;

      // Display skills in a grid
      const skillsPerRow = 3;
      const columnWidth = 155;

      cv.skills.forEach((skill, index) => {
        const column = index % skillsPerRow;
        const row = Math.floor(index / skillsPerRow);

        const xPos = 50 + (column * columnWidth);
        const yPos = yPosition + (row * 20);

        // Check page break
        if (yPos > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.text)
           .circle(xPos, yPos + 4, 2)
           .fill(colors.secondary)
           .text(skill, xPos + 8, yPos, { width: columnWidth - 8 });
      });

      yPosition += Math.ceil(cv.skills.length / skillsPerRow) * 20 + 20;
    }

    // ===== LANGUAGES =====
    if (cv.languages && cv.languages.length > 0) {
      // Check page break
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      addSection(doc, 'IDIOMAS', yPosition, colors);
      yPosition += 35;

      cv.languages.forEach((lang, index) => {
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor(colors.text)
           .text(lang.name, 50, yPosition);

        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(colors.lightGray)
           .text(` - ${capitalizeFirstLetter(lang.level)}`, 50 + doc.widthOfString(lang.name), yPosition);

        yPosition += 20;
      });

      yPosition += 10;
    }

    // ===== FOOTER =====
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc.font('Helvetica')
         .fontSize(8)
         .fillColor(colors.lightGray)
         .text(
           `Generado con VORTEX Surlink - ${new Date().toLocaleDateString('es-ES')} - Página ${i + 1} de ${pageCount}`,
           50,
           doc.page.height - 30,
           {
             width: 495,
             align: 'center'
           }
         );
    }

    // Finalize PDF
    doc.end();

    logger.info('PDF CV generated successfully', { userId: cv.userId });
  } catch (error) {
    logger.error('Error generating PDF CV', { error: error.message });
    throw error;
  }
}

/**
 * Helper function to add section headers
 */
function addSection(doc, title, yPosition, colors) {
  doc.font('Helvetica-Bold')
     .fontSize(14)
     .fillColor(colors.secondary)
     .text(title, 50, yPosition);

  // Underline
  doc.moveTo(50, yPosition + 18)
     .lineTo(50 + doc.widthOfString(title), yPosition + 18)
     .lineWidth(2)
     .strokeColor(colors.secondary)
     .stroke();
}

/**
 * Helper function to capitalize first letter
 */
function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default {
  generateCVPDF
};
