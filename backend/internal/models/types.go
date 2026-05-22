package models

type CutParams struct {
	BgThreshold int  `json:"bgThreshold"`
	MinSize     int  `json:"minSize"`
	GroupDilate int  `json:"groupDilate"`
	Padding     int  `json:"padding"`
	KeepShadow  bool `json:"keepShadow"`
}

type Box struct {
	ID int `json:"id"`
	X  int `json:"x"`
	Y  int `json:"y"`
	W  int `json:"w"`
	H  int `json:"h"`
}

type AnalyzeResponse struct {
	Suggested         CutParams `json:"suggested"`
	Profile           string    `json:"profile"`
	Note              string    `json:"note"`
	MixedSizeWarning  bool      `json:"mixedSizeWarning"`
}

type PreviewRequest struct {
	Image  string    `json:"image"`
	Params CutParams `json:"params"`
}

type PreviewResponse struct {
	Count int   `json:"count"`
	Boxes []Box `json:"boxes"`
	Rows  int   `json:"rows"`
}

type CutRequest struct {
	Image   string    `json:"image"`
	Params  CutParams `json:"params"`
	Exclude []int     `json:"exclude"`
	Merge   [][]int   `json:"merge"`
}

type CutResponse struct {
	Count     int    `json:"count"`
	OutputDir string `json:"outputDir"`
	Manifest  string `json:"manifest"`
}

type Preset struct {
	ID     string    `json:"id"`
	Name   string    `json:"name"`
	Params CutParams `json:"params"`
}

type PromptRecord struct {
	ID          string `json:"id"`
	Image       string `json:"image"`
	InputPrompt string `json:"inputPrompt"`
	Prompt      string `json:"prompt"`
	CreatedAt   string `json:"createdAt"`
}

type ImageInfo struct {
	Name   string `json:"name"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Size   int64  `json:"size"`
	URL    string `json:"url"`
}
