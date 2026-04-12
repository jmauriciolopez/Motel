SELECT 
  (SELECT COUNT(*) FROM "Rubro") as rubros,
  (SELECT COUNT(*) FROM "CatalogoProducto") as catalogo;
