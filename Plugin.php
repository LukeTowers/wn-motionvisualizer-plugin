<?php

namespace LukeTowers\MotionVisualizer;

use Backend;
use Backend\Models\UserRole;
use System\Classes\PluginBase;

/**
 * MotionVisualizer Plugin Information File
 */
class Plugin extends PluginBase
{
    /**
     * Returns information about this plugin.
     */
    public function pluginDetails(): array
    {
        return [
            'name'        => 'luketowers.motionvisualizer::lang.plugin.name',
            'description' => 'luketowers.motionvisualizer::lang.plugin.description',
            'author'      => 'LukeTowers',
            'icon'        => 'icon-leaf'
        ];
    }

    /**
     * Registers any frontend components implemented in this plugin.
     */
    public function registerComponents(): array
    {
        return [
            \LukeTowers\MotionVisualizer\Components\Visualizer::class => 'visualizer',
        ];
    }
}
