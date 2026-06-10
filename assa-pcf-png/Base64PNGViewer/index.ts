import {IInputs, IOutputs} from "./generated/ManifestTypes";

export class Base64PNGViewer implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private _notifyOutputChanged: () => void;
    private _container: HTMLDivElement;
    private _context: ComponentFramework.Context<IInputs>;

    /**
     * Empty constructor.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {

    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the ControlManifest, as well as utility functions.
     * @param notifyOutputChanged A function to call when the control has made a change that requires an update of the notified properties.
     * @param state A piece of data that persists in one session for each unique instance of the control.
     * @param container If a control is marked control-type="standard", it will receive an empty div element within which it can render its content.
     */
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement): void
    {
        this._notifyOutputChanged = notifyOutputChanged;
        this._container = container;
        this._context = context;
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as client-side context or offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the ControlManifest, as well as utility functions.
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void
    {
        this._context = context;
        const base64Content = context.parameters.base64Content.raw;
        const fileName = context.parameters.fileName.raw;

        if (base64Content) {
            this._container.innerHTML = `
                <div style="padding: 10px;">
                    <img src="data:image/png;base64,${base64Content}" style="max-width: 100%; height: auto;" alt="${fileName || 'PNG Image'}" />
                </div>
            `;
        } else {
            this._container.innerHTML = '<div style="padding: 10px; color: #999;">No image data provided</div>';
        }
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs
    {
        return {};
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. canceling any pending remote calls, removing listeners, etc.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public destroy(): void {

    }
}
