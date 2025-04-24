import { formatFiles, generateFiles, Tree } from '@nx/devkit';
import * as path from 'path';

export default async function (tree: Tree, schema: any) {
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
  const fileName = `${timestamp}_${schema.name}.sql`;

  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    'supabase/migrations',
    {
      fileName,
      name: schema.name,
      template: ''
    }
  );

  await formatFiles(tree);
}
