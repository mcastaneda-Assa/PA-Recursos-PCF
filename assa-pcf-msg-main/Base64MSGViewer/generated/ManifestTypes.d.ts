/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    fileName: ComponentFramework.PropertyTypes.StringProperty;
    base64Content: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    fileName?: string;
    base64Content?: string;
}
