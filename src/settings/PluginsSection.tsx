/**
 * Plugins Settings Section
 * Displays unified plugin manager for all config-based plugins
 */

import { PluginManager } from '../components/PluginManager';
import '../plugins/plugins.css';

export function PluginsSection() {
  return (
    <section className="settings-section">
      <PluginManager />
    </section>
  );
}
