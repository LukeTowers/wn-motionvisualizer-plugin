<?php namespace LukeTowers\MotionVisualizer\Components;

use Cms\Classes\ComponentBase;

class Visualizer extends ComponentBase
{
    /**
     * Gets the details for the component
     */
    public function componentDetails()
    {
        return [
            'name'        => 'Visualizer Component',
            'description' => 'No description provided yet...'
        ];
    }

    /**
     * Returns the properties provided by the component
     */
    public function defineProperties()
    {
        return [];
    }

    public function onRender()
    {
        $this->injectAssets();
    }

    public function injectAssets()
    {
        $this->controller->addVite([
            'assets/src/css/luketowers-motionvisualizer.css',
            'assets/src/js/luketowers-motionvisualizer.js'
        ], 'LukeTowers.MotionVisualizer');
    }
}
