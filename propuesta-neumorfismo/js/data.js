(function () {
  const products = [
    { id: 'manos', name: 'Protección de manos', group: 'Protección personal', description: 'Guantes para cada nivel de exposición y exigencia operativa.', items: ['Protección química', 'Uso general', 'Resistentes al corte', 'Protección térmica', 'Cuero y carnaza'], icon: 'hand' },
    { id: 'corporal', name: 'Protección corporal', group: 'Protección personal', description: 'Prendas especializadas para ambientes críticos y tareas demandantes.', items: ['Protección Tyvek', 'Protección química', 'Impermeables', 'Prendas antiestáticas', 'Mandiles y carnaza', 'Rodilleras', 'Retardantes a la flama', 'Prendas aluminizadas', 'Chamarras'], icon: 'body' },
    { id: 'vial', name: 'Protección vial', group: 'Seguridad industrial', description: 'Señalización y alta visibilidad para ordenar áreas de tránsito.', items: ['Conos, postes y trafitambos', 'Boyas, cadenas y cintas', 'Banderines y mallas', 'Chalecos de malla', 'Chalecos de poliéster', 'Chalecos brigadistas'], icon: 'cone' },
    { id: 'caidas', name: 'Protección contra caídas', group: 'Protección personal', description: 'Sistemas para trabajo seguro en altura y espacios confinados.', items: ['Arneses y eslingas', 'Puntos fijos', 'Autorretráctiles', 'Cinturones', 'Tripiés y sujetadores', 'Líneas de vida', 'Absorbedores de impacto', 'Accesorios'], icon: 'height' },
    { id: 'respiratoria', name: 'Protección respiratoria', group: 'Protección personal', description: 'Soluciones para ayudar a reducir la exposición respiratoria.', items: ['Mascarillas 3M', 'Filtros y cartuchos', 'Respiradores 3M', 'Respiradores Moldex', 'Respiradores Honeywell', 'Autorrescatadores'], icon: 'mask' },
    { id: 'cabeza', name: 'Protección para la cabeza', group: 'Protección personal', description: 'Cobertura confiable para cabeza y rostro en planta.', items: ['Productos JYRSA', 'Productos Honeywell', 'Productos MSA', 'Gorras y capuchas'], icon: 'helmet' },
    { id: 'desechables', name: 'Desechables', group: 'Protección personal', description: 'Consumibles prácticos para higiene y control de exposición.', items: ['Cubrebocas', 'Cofias', 'Capuchas'], icon: 'disposable' },
    { id: 'gas', name: 'Detectores de gas', group: 'Seguridad industrial', description: 'Monitoreo portátil para reconocer atmósferas de riesgo.', items: ['Detectores monogás', 'Detectores multigás'], icon: 'gas' },
    { id: 'ergonomica', name: 'Protección ergonómica', group: 'Protección personal', description: 'Soporte diseñado para jornadas y movimientos repetitivos.', items: ['Fajas', 'Accesorios'], icon: 'ergonomic' },
    { id: 'visual', name: 'Protección visual', group: 'Protección personal', description: 'Alternativas para impactos, partículas y salpicaduras.', items: ['Lentes de protección', 'Goggles', 'Micas y cabezales', 'Máscaras para soldar', 'Accesorios'], icon: 'eye' },
    { id: 'auditiva', name: 'Protección auditiva', group: 'Protección personal', description: 'Opciones desechables y reutilizables para control de ruido.', items: ['Tapones auditivos desechables', 'Tapones auditivos reutilizables', 'Orejeras'], icon: 'ear' },
    { id: 'pies', name: 'Protección para pies', group: 'Protección personal', description: 'Calzado pensado para las condiciones de la operación.', items: ['Tenis de seguridad', 'Botas de seguridad', 'Botas de hule', 'Zapato de seguridad'], icon: 'boot' },
    { id: 'derrames', name: 'Control de derrames', group: 'Seguridad industrial', description: 'Respuesta y contención para incidentes con líquidos.', items: ['Absorbentes', 'Manejo de materiales'], icon: 'drop' },
    { id: 'almacenamiento', name: 'Almacenamiento y manejo', group: 'Soluciones para planta', description: 'Productos para ordenar, mover y resguardar materiales.', items: ['Almacenamiento', 'Manejo de materiales'], icon: 'box' },
    { id: 'senalamientos', name: 'Señalamientos y extintores', group: 'Seguridad industrial', description: 'Elementos esenciales para prevención y respuesta.', items: ['Señalamientos', 'Extintores', 'Recarga de extintor', 'Lámpara de emergencia'], icon: 'sign' },
    { id: 'lockout', name: 'Lockout / Tagout', group: 'Seguridad industrial', description: 'Bloqueo y etiquetado para el control seguro de energías.', items: ['Productos Brady', 'Productos Master Lock', 'Productos ABUS', 'Bloqueo y etiquetado'], icon: 'lock' },
    { id: 'isotonicas', name: 'Bebidas isotónicas', group: 'Bienestar laboral', description: 'Hidratación para equipos que trabajan en condiciones exigentes.', items: ['Bebidas hidratantes', 'Sueros', 'Refrescos'], icon: 'bottle' },
    { id: 'integrales', name: 'Soluciones integrales', group: 'Soluciones para planta', description: 'Suministros complementarios para centralizar necesidades de planta.', items: ['Material eléctrico', 'Pintura', 'Ferretería', 'Papelería', 'Imprenta rápida'], icon: 'grid' },
    { id: 'facial', name: 'Protección facial', group: 'Protección personal', description: 'Cobertura del rostro para trabajos con partículas y salpicaduras.', items: ['Cabezales', 'Micas', 'Protectores faciales', 'Cristales'], icon: 'shield' },
    { id: 'automatizacion', name: 'Automatización industrial', group: 'Soluciones para planta', description: 'Herramental y dispositivos para los procesos de tu industria.', items: ['Dispositivos industriales', 'Herramental', 'Allen-Bradley', 'Yaskawa', 'Parker'], icon: 'grid' },
    { id: 'promocionales', name: 'Regalos y promocionales', group: 'Corporativos y eventos', description: 'Detalles personalizados para clientes, colaboradores y celebraciones de empresa.', items: ['Artículos promocionales', 'Kits de cumpleaños', 'Box corporativas', 'Obsequios navideños', 'Personalización láser y vinil'], icon: 'box' },
    { id: 'eventos', name: 'Eventos corporativos', group: 'Corporativos y eventos', description: 'Decoración y detalles para los momentos importantes de tu equipo.', items: ['Decoración con globos', 'Ambientación de eventos', 'Repostería y pasteles', 'Snacks'], icon: 'grid' },
    { id: 'urgencias', name: 'Atención a urgencias', group: 'Soluciones para planta', description: 'Atención a compras diversas y requerimientos especiales. Consulta disponibilidad y tiempos.', items: ['Motores', 'Baleros', 'Aceites', 'Refrigeradores', 'Lonas impresas', 'Papelería'], icon: 'grid' },
  ];

  const brands = ['3M', 'ABUS', 'ARCA', 'Allen-Bradley', 'ADEX', 'Ansell', 'Antiestatics', 'Armada', 'Alyger', 'Banom', 'Berrendo', 'Procliff', 'Cordova', 'Derma Care', 'DeWalt', 'Dräger', 'DuPont', 'Duramax', 'Encon', 'Elvex', 'Fibre-Metal', 'Fonic', 'Galgo', 'Golden Eagle', 'Guantes Internacionales', 'Green Stuff', 'GUMA', 'GVS', 'Herhild', 'HexArmor', 'Honeywell', 'Howard Leight', 'Idra Power', 'Infra', 'Jackson Safety', 'JYRSA', 'Kalso', 'Kimberly-Clark', 'Libus', 'Miller', 'MSA', 'North', 'PIP', 'Radians', 'Romak', 'Safe-Fit', 'Safety Zone', 'Servus', 'Skold', 'Superior Glove', 'TUK', 'Uvex', 'VI4', 'Warthog', 'West Chester', 'Yaskawa', 'Parker', 'Mercatoro'];

  window.TULAH_DATA = Object.freeze({
    phone: '528114744867',
    displayPhone: '+52 81 1474 4867',
    emails: ['juan.salinas@tulah.mx', 'viridiana@tulah.mx'],
    address: 'Gral. Pablo González Garza #225, Col. Fracc. Gonzalitos, Monterrey, Nuevo León, C.P. 64020',
    location: 'Monterrey, Nuevo León',
    nav: [
      { href: 'index.html', label: 'Inicio' },
      { href: 'nosotros.html', label: 'Nosotros' },
      { href: 'productos.html', label: 'Productos' },
      { href: 'sinergia.html', label: 'Sinergia' },
      { href: 'identidad.html', label: 'Identidad' },
      { href: 'contacto.html', label: 'Contacto' },
    ],
    products,
    brands,
  });
})();
