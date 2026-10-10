-- Lets the app check that the database has every migration its code expects (shown to owners under Settings > Updates).
GRANT SELECT ON _prisma_migrations TO nexus_service;
