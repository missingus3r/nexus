// Static data for Surlink Financial section
// Contains curated financial institutions, banks, and financial service providers

const financialSites = {
  bancos: [
    {
      id: 'brou',
      name: 'Banco República (BROU)',
      url: 'https://www.brou.com.uy',
      domain: 'brou.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=brou.com.uy&sz=128',
      description: 'Banco público del Estado uruguayo. Créditos hipotecarios, préstamos personales, cuentas y servicios financieros integrales.',
      phone: '1720',
      address: 'Cerrito 351, Montevideo',
      category: 'bancos',
      serviceType: 'Crédito Hipotecario, Préstamo Personal',
      featured: true
    },
    {
      id: 'santander',
      name: 'Banco Santander Uruguay',
      url: 'https://www.santander.com.uy',
      domain: 'santander.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=santander.com.uy&sz=128',
      description: 'Banco internacional con amplia gama de productos. Hipotecarios, tarjetas de crédito, inversiones y seguros.',
      phone: '0800 9999',
      address: 'Zabala 1463, Montevideo',
      category: 'bancos',
      serviceType: 'Crédito Hipotecario, Tarjeta de Crédito',
      featured: true
    },
    {
      id: 'itau',
      name: 'Banco Itaú Uruguay',
      url: 'https://www.itau.com.uy',
      domain: 'itau.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=itau.com.uy&sz=128',
      description: 'Soluciones bancarias personalizadas para particulares y empresas. Créditos, inversiones y banca digital de excelencia.',
      phone: '1784',
      address: 'Zabala 1505, Montevideo',
      category: 'bancos',
      serviceType: 'Crédito Personal, Inversión',
      featured: true
    },
    {
      id: 'scotiabank',
      name: 'Scotiabank Uruguay',
      url: 'https://www.scotiabank.com.uy',
      domain: 'scotiabank.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=scotiabank.com.uy&sz=128',
      description: 'Banco canadiense con presencia en Uruguay. Productos para individuos y empresas con tasas competitivas.',
      phone: '0800 7268',
      address: 'Av. Italia 2665, Montevideo',
      category: 'bancos',
      serviceType: 'Crédito Hipotecario, Préstamo',
      featured: false
    },
    {
      id: 'bbva',
      name: 'BBVA Uruguay',
      url: 'https://www.bbva.com.uy',
      domain: 'bbva.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bbva.com.uy&sz=128',
      description: 'Banco español con servicios financieros integrales. Banca digital, préstamos e inversiones.',
      phone: '0800 2282',
      address: 'Zabala 1463, Montevideo',
      category: 'bancos',
      serviceType: 'Préstamo Personal, Tarjeta de Crédito',
      featured: false
    },
    {
      id: 'heritage',
      name: 'Banco Heritage',
      url: 'https://www.bancoheritage.com.uy',
      domain: 'bancoheritage.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bancoheritage.com.uy&sz=128',
      description: 'Banco uruguayo enfocado en banca privada y corporativa con servicios personalizados.',
      phone: '+598 2628 6868',
      address: 'Plaza Independencia 831, Montevideo',
      category: 'bancos',
      serviceType: 'Inversión, Crédito',
      featured: false
    },
    {
      id: 'citibank',
      name: 'Citibank N.A. Sucursal Uruguay',
      url: 'https://www.citibank.com/icg/sa/latam/uruguay/',
      domain: 'citibank.com',
      logo: 'https://www.google.com/s2/favicons?domain=citibank.com&sz=128',
      description: 'Servicios para corporaciones e instituciones: cash management, comercio exterior y tesorería.',
      phone: '2603 0374',
      address: 'Costa Rica 1740, Montevideo',
      category: 'bancos',
      serviceType: 'Corporativo, Tesorería',
      featured: false
    },
    {
      id: 'bandes',
      name: 'Banco Bandes Uruguay S.A.',
      url: 'https://www.bandes.com.uy',
      domain: 'bandes.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bandes.com.uy&sz=128',
      description: 'Banco privado supervisado por BCU con enfoque en personas y Mipymes. Amplia red de sucursales en todo el país.',
      phone: 'Ver sitio web',
      address: 'Zabala 1338, Montevideo',
      category: 'bancos',
      serviceType: 'Crédito, Servicios Bancarios',
      featured: false
    },
    {
      id: 'bhu',
      name: 'Banco Hipotecario del Uruguay (BHU)',
      url: 'https://www.bhu.com.uy',
      domain: 'bhu.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bhu.com.uy&sz=128',
      description: 'Banco público especializado en créditos hipotecarios. Programa Yo Ahorro en UI para compra, reforma o construcción con tasas preferenciales.',
      phone: '1911',
      address: 'Av. 18 de Julio 1452, Montevideo',
      category: 'bancos',
      serviceType: 'Crédito Hipotecario, Ahorro',
      featured: true
    }
  ],
  cooperativas: [
    {
      id: 'cofac',
      name: 'COFAC - Cooperativa de Ahorro y Crédito',
      url: 'https://www.cofac.com.uy',
      domain: 'cofac.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=cofac.com.uy&sz=128',
      description: 'Cooperativa de ahorro y crédito con tasas preferenciales para socios. Préstamos personales e hipotecarios.',
      phone: '+598 2901 5050',
      address: 'Maldonado 1260, Montevideo',
      category: 'cooperativas',
      serviceType: 'Préstamo Personal, Crédito Hipotecario',
      featured: true
    },
    {
      id: 'fucerep',
      name: 'FUCEREP - Cooperativa de Ahorro y Crédito',
      url: 'https://www.fucerep.com.uy',
      domain: 'fucerep.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=fucerep.com.uy&sz=128',
      description: 'Cooperativa con líneas de crédito a familias y microempresas; tarjeta Cabal.',
      phone: '+598 2900 2328',
      address: 'Colonia 955, Montevideo',
      category: 'cooperativas',
      serviceType: 'Préstamo, Tarjeta',
      featured: false
    },
    {
      id: 'verde-fucac',
      name: 'VERDE (FUCAC) - Cooperativa de Ahorro y Crédito',
      url: 'https://www.verde.com.uy',
      domain: 'verde.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=verde.com.uy&sz=128',
      description: 'Cooperativa de ahorro y crédito (evolución de FUCAC) con préstamos y tarjeta.',
      phone: '+598 2626 0011',
      address: 'Av. Luis A. de Herrera 1248, Torre II, Piso 12, Montevideo',
      category: 'cooperativas',
      serviceType: 'Préstamo, Tarjeta',
      featured: true
    },
    {
      id: 'ceprodih',
      name: 'CEPRODIH - Cooperativa',
      url: 'https://ceprodih.org/',
      domain: 'ceprodih.org',
      logo: 'https://www.google.com/s2/favicons?domain=ceprodih.org&sz=128',
      description: 'Cooperativa especializada en soluciones de ahorro y préstamos con beneficios para asociados.',
      phone: '+598 2900 7878',
      address: 'Av. 18 de Julio 1333, Montevideo',
      category: 'cooperativas',
      serviceType: 'Préstamo Personal, Ahorro',
      featured: false
    }
  ],
  seguros: [
    {
      id: 'bse',
      name: 'Banco de Seguros del Estado (BSE)',
      url: 'https://www.bse.com.uy',
      domain: 'bse.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bse.com.uy&sz=128',
      description: 'Aseguradora del Estado con seguros de vida, hogar, auto, salud y retiro. Amplia cobertura nacional.',
      phone: '0800 2738',
      address: 'Av. Libertador 1465, Montevideo',
      category: 'seguros',
      serviceType: 'Seguro',
      featured: true
    },
    {
      id: 'sura',
      name: 'SURA Uruguay',
      url: 'https://www.sura.com.uy',
      domain: 'sura.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=sura.com.uy&sz=128',
      description: 'Seguros de vida, retiro, ahorro y protección. Planes personalizados con asesoramiento profesional.',
      phone: '1997',
      address: 'Zabala 1520, Montevideo',
      category: 'seguros',
      serviceType: 'Seguro',
      featured: true
    },
    {
      id: 'mapfre',
      name: 'MAPFRE Uruguay',
      url: 'https://www.mapfre.com.uy',
      domain: 'mapfre.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=mapfre.com.uy&sz=128',
      description: 'Compañía internacional de seguros con cobertura integral: auto, hogar, vida, salud y más.',
      phone: '+598 2916 1111',
      address: 'Juncal 1392, Montevideo',
      category: 'seguros',
      serviceType: 'Seguro',
      featured: false
    },
    {
      id: 'sancor-seguros',
      name: 'Sancor Seguros Uruguay',
      url: 'https://www.sancorseguros.com.uy',
      domain: 'sancorseguros.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=sancorseguros.com.uy&sz=128',
      description: 'Seguros de auto, hogar, agro y empresas con atención personalizada y red de servicios.',
      phone: '+598 2902 0800',
      address: 'Colonia 1021, Montevideo',
      category: 'seguros',
      serviceType: 'Seguro',
      featured: false
    }
  ],
  financieras: [
    {
      id: 'creditel',
      name: 'SOCUR S.A. (Creditel)',
      url: 'https://www.creditel.com.uy',
      domain: 'creditel.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=creditel.com.uy&sz=128',
      description: 'Préstamos personales 100% online y tarjeta Mastercard con beneficios.',
      phone: '2628 3401',
      address: 'Av. Dr. Américo Ricaldoni 1674, Montevideo',
      category: 'financieras',
      serviceType: 'Préstamo Personal, Tarjeta',
      featured: true
    },
    {
      id: 'oca',
      name: 'OCA S.A. (OCA Card / OCA Blue)',
      url: 'https://oca.uy',
      domain: 'oca.uy',
      logo: 'https://www.google.com/s2/favicons?domain=oca.uy&sz=128',
      description: 'Tarjetas de crédito Visa/Mastercard, cuenta digital OCA Blue y préstamos.',
      phone: '2902 3657 / 1730',
      address: 'Colonia 1426, Montevideo',
      category: 'financieras',
      serviceType: 'Tarjeta de Crédito, Billetera',
      featured: true
    },
    {
      id: 'passcard',
      name: 'PassCard',
      url: 'https://www.passcard.com.uy',
      domain: 'passcard.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=passcard.com.uy&sz=128',
      description: 'Tarjeta de crédito con cuotas, descuentos y retiros en efectivo.',
      phone: 'Ver sitio web',
      address: 'Yaguarón 1403 esq. Colonia, Montevideo',
      category: 'financieras',
      serviceType: 'Tarjeta de Crédito',
      featured: false
    },
    {
      id: 'cabal',
      name: 'Cabal Uruguay S.A.',
      url: 'https://www.cabal.com.uy',
      domain: 'cabal.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=cabal.com.uy&sz=128',
      description: 'Red y tarjetas Cabal; servicios para usuarios y comercios.',
      phone: '2712 3333',
      address: 'Víctor Soliño 349, Piso 11, Montevideo',
      category: 'financieras',
      serviceType: 'Tarjeta de Crédito, Red',
      featured: false
    },
    {
      id: 'anda',
      name: 'ANDA - Cooperativa de Ahorro',
      url: 'https://www.anda.com.uy',
      domain: 'anda.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=anda.com.uy&sz=128',
      description: 'Institución financiera con préstamos para socios. Tasas accesibles y plazos flexibles.',
      phone: '+598 2409 4646',
      address: '8 de Octubre 2601, Montevideo',
      category: 'financieras',
      serviceType: 'Préstamo',
      featured: false
    },
    {
      id: 'abitab',
      name: 'Abitab S.A.',
      url: 'https://www.abitab.com.uy',
      domain: 'abitab.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=abitab.com.uy&sz=128',
      description: 'Red de cobranza y servicios financieros: pagos, recargas, giros y más.',
      phone: '2500 5000',
      address: 'Ver sitio web',
      category: 'financieras',
      serviceType: 'Red de Pagos',
      featured: false
    },
    {
      id: 'pronto',
      name: 'Promotora de Créditos S.A. (Pronto!)',
      url: 'https://www.pronto.com.uy',
      domain: 'pronto.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=pronto.com.uy&sz=128',
      description: 'Préstamos personales y tarjeta Pronto+ con gestión en sucursales y app.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'financieras',
      serviceType: 'Préstamo Personal, Tarjeta',
      featured: false
    },
    {
      id: 'midinero',
      name: 'MIDINERO (Redpagos)',
      url: 'https://www.midinero.com.uy',
      domain: 'midinero.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=midinero.com.uy&sz=128',
      description: 'Tarjeta prepaga Mastercard y app para pagos, recargas y transferencias.',
      phone: '2705 5555',
      address: 'Ver sitio web',
      category: 'financieras',
      serviceType: 'Billetera, Tarjeta Prepaga',
      featured: true
    },
    {
      id: 'redpagos',
      name: 'NUMMI S.A. (Redpagos)',
      url: 'https://www.redpagos.com.uy',
      domain: 'redpagos.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=redpagos.com.uy&sz=128',
      description: 'Red de pagos y cobranzas; recaudación, giros y servicios para empresas.',
      phone: '2700 8788',
      address: 'Ver sitio web',
      category: 'financieras',
      serviceType: 'Red de Pagos',
      featured: false
    },
    {
      id: 'banred',
      name: 'BANRED S.A.',
      url: 'https://www.banred.com.uy',
      domain: 'banred.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=banred.com.uy&sz=128',
      description: 'Red de cajeros automáticos y servicios de pagos electrónicos del sistema bancario.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'financieras',
      serviceType: 'Red de Cajeros',
      featured: false
    },
    {
      id: 'nixus',
      name: 'Nixus Servicios Financieros',
      url: 'https://www.nixus.com.uy',
      domain: 'nixus.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=nixus.com.uy&sz=128',
      description: 'Empresa de servicios financieros autorizada por BCU. Préstamos, transferencias, compra-venta de divisas y metales preciosos.',
      phone: '+598 2200 7452',
      address: 'Yí 1530, Montevideo',
      category: 'financieras',
      serviceType: 'Préstamo, Cambio',
      featured: false
    },
    {
      id: 'gales',
      name: 'GALES Servicios Financieros',
      url: 'https://www.gales.com.uy',
      domain: 'gales.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=gales.com.uy&sz=128',
      description: 'Empresa familiar de servicios financieros regulada por BCU. Más de 40 años ofreciendo cambio de divisas y servicios financieros.',
      phone: 'Ver sitio web',
      address: 'Av. Dr. Luis Alberto De Herrera 1248 Local 20, Montevideo',
      category: 'financieras',
      serviceType: 'Cambio, Servicios Financieros',
      featured: false
    },
    {
      id: 'indumex',
      name: 'INDUMEX Servicios Financieros',
      url: 'https://www.indumex.com',
      domain: 'indumex.com',
      logo: 'https://www.google.com/s2/favicons?domain=indumex.com&sz=128',
      description: 'Empresa de servicios financieros con 11 sucursales. Cambio de divisas, cobranza de facturas y tarjetas prepagas.',
      phone: 'Ver sitio web',
      address: 'Sucursales en Montevideo, Punta del Este, Colonia, Paysandú, Salto y Rivera',
      category: 'financieras',
      serviceType: 'Cambio, Tarjeta Prepaga',
      featured: false
    },
    {
      id: 'varlix',
      name: 'VARLIX Servicios Financieros',
      url: 'https://www.varlix.com.uy',
      domain: 'varlix.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=varlix.com.uy&sz=128',
      description: 'Empresa con más de 30 años en el mercado financiero uruguayo. Compra-venta de divisas, cheques de jubilación, giros y transferencias.',
      phone: 'Ver sitio web',
      address: 'Divina Comedia 1689, Montevideo',
      category: 'financieras',
      serviceType: 'Cambio, Transferencias',
      featured: false
    },
    {
      id: 'deanda',
      name: 'DEANDA (Tarjeta ANDA)',
      url: 'https://www.deanda.com.uy',
      domain: 'deanda.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=deanda.com.uy&sz=128',
      description: 'Tarjeta prepaga de nómina asociada a ANDA. Sistema de pago para empleadores y empleados con acceso en sucursales ANDA.',
      phone: '+598 2409 4646',
      address: 'Sucursales ANDA en todo el país',
      category: 'financieras',
      serviceType: 'Tarjeta Prepaga, Nómina',
      featured: false
    }
  ],
  fintech: [
    {
      id: 'prex',
      name: 'Prex Uruguay',
      url: 'https://www.prex.uy',
      domain: 'prex.uy',
      logo: 'https://www.google.com/s2/favicons?domain=prex.uy&sz=128',
      description: 'Billetera digital con tarjeta internacional, transferencias y cobros online.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'fintech',
      serviceType: 'Billetera Digital, Tarjeta Prepaga',
      featured: true
    },
    {
      id: 'paganza',
      name: 'Paganza',
      url: 'https://www.paganza.com',
      domain: 'paganza.com',
      logo: 'https://www.google.com/s2/favicons?domain=paganza.com&sz=128',
      description: 'App para pagar facturas y servicios escaneando códigos y agendando pagos.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'fintech',
      serviceType: 'Pagos y Servicios',
      featured: false
    },
    {
      id: 'dlocal',
      name: 'dLocal',
      url: 'https://www.dlocal.com/es/',
      domain: 'dlocal.com',
      logo: 'https://www.google.com/s2/favicons?domain=dlocal.com&sz=128',
      description: 'Pasarela de pagos cross‑border para grandes comercios; pay‑ins y pay‑outs en mercados emergentes.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'fintech',
      serviceType: 'Pagos Transfronterizos (B2B)',
      featured: true
    },
    {
      id: 'grin',
      name: 'GRIN (FUCAC Dinero Electrónico)',
      url: 'https://grin.com.uy',
      domain: 'grin.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=grin.com.uy&sz=128',
      description: 'Institución Emisora de Dinero Electrónico regulada por BCU, propiedad de VERDE. Cuenta digital gratuita con crédito instantáneo y tarjeta prepaga.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'fintech',
      serviceType: 'Billetera Digital, Dinero Electrónico',
      featured: true
    }
  ],
  inversion: [
    {
      id: 'republica-afisa',
      name: 'República AFISA',
      url: 'https://www.republicafisa.com.uy/',
      domain: 'republicafisa.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=republicafisa.com.uy&sz=128',
      description: 'Administradora de fondos de inversión con productos diversificados y asesoramiento especializado.',
      phone: '+598 2915 9090',
      address: 'Rincón 528, Montevideo',
      category: 'inversion',
      serviceType: 'Inversión',
      featured: false
    },
    {
      id: 'bvm',
      name: 'Bolsa de Valores de Montevideo (BVM)',
      url: 'https://www.bvm.com.uy',
      domain: 'bvm.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bvm.com.uy&sz=128',
      description: 'Mercado de valores de Uruguay. Negociación de acciones, obligaciones negociables, fondos de inversión. Operaciones bursátiles y registro OTC.',
      phone: '+598 2916 5051',
      address: 'Misiones 1400, Montevideo',
      category: 'inversion',
      serviceType: 'Mercado de Valores',
      featured: true
    },
    {
      id: 'bevsa',
      name: 'BEVSA (Bolsa Electrónica de Valores)',
      url: 'https://www.bevsa.com.uy',
      domain: 'bevsa.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bevsa.com.uy&sz=128',
      description: 'Plataforma electrónica para negociación mayorista de instrumentos financieros.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'inversion',
      serviceType: 'Mercado de Valores',
      featured: true
    },
    {
      id: 'gletir',
      name: 'Gletir Corredor de Bolsa S.A.',
      url: 'https://www.gletir.com',
      domain: 'gletir.com',
      logo: 'https://www.google.com/s2/favicons?domain=gletir.com&sz=128',
      description: 'Gestión patrimonial, asesoramiento e inversiones locales e internacionales.',
      phone: '2628 3047 / 2628 6055',
      address: 'Av. Luis A. de Herrera 1248, Torre 2, Piso 9, Montevideo',
      category: 'inversion',
      serviceType: 'Intermediario de Valores',
      featured: false
    },
    {
      id: 'nobilis',
      name: 'Nobilis',
      url: 'https://nobilis.com.uy',
      domain: 'nobilis.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=nobilis.com.uy&sz=128',
      description: 'Intermediario regulado por BCU; gestión patrimonial y banca de inversión.',
      phone: '2915 5533',
      address: 'Ver sitio web',
      category: 'inversion',
      serviceType: 'Intermediario de Valores',
      featured: false
    },
    {
      id: 'balanz',
      name: 'Balanz Uruguay Agente de Valores S.A.',
      url: 'https://balanz.com.uy',
      domain: 'balanz.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=balanz.com.uy&sz=128',
      description: 'Plataforma y asesoramiento para invertir en bonos, acciones y fondos.',
      phone: '2626 2707',
      address: 'Dr. Luis Bonavita 1294, Of. 2401, Montevideo (WTC)',
      category: 'inversion',
      serviceType: 'Intermediario de Valores',
      featured: false
    },
    {
      id: 'campiglia-pilay',
      name: 'Campiglia Pilay',
      url: 'https://www.campigliapilay.com.uy',
      domain: 'campigliapilay.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=campigliapilay.com.uy&sz=128',
      description: 'Fideicomiso financiero para ahorro e inversión en proyectos inmobiliarios. Cuotas mensuales en pesos con respaldo en ladrillos y libertad de retiro.',
      phone: '2628 0049',
      address: 'José Leguizamón 3552, Montevideo',
      category: 'inversion',
      serviceType: 'Fideicomiso Inmobiliario',
      featured: false
    }
  ],
  procesadores: [
    {
      id: 'geocom',
      name: 'Geocom Uruguay S.A.',
      url: 'https://www.geocom.com.uy',
      domain: 'geocom.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=geocom.com.uy&sz=128',
      description: 'Soluciones de adquirencia y POS (GEOPos) para comercios y omnicanal retail.',
      phone: 'Ver sitio web',
      address: 'Ver sitio web',
      category: 'procesadores',
      serviceType: 'Procesador, Adquirencia (POS)',
      featured: false
    },
    {
      id: 'fiserv',
      name: 'Fiserv Uruguay / FirstData Uruguay',
      url: 'https://www.fiserv.com.uy',
      domain: 'fiserv.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=fiserv.com.uy&sz=128',
      description: 'Tecnología de pagos y adquirencia; terminales, anticipación de pagos y más.',
      phone: '0800 1244 / *4444',
      address: 'Ver sitio web',
      category: 'procesadores',
      serviceType: 'Procesador, Adquirencia',
      featured: false
    }
  ]
};

// Helper functions to retrieve sites
export const getSitesByCategory = (category) => {
  return financialSites[category] || [];
};

export const getAllSites = () => {
  return Object.values(financialSites).flat();
};

export const getSiteById = (id) => {
  const allSites = getAllSites();
  return allSites.find(site => site.id === id);
};

export default financialSites;
