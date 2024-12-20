from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io
import json
import matplotlib.pyplot as plt
import seaborn as sns
import base64
import uvicorn
from typing import Optional, Dict, Any, List

app = FastAPI()

@app.post("/read_csv")
async def read_csv(file: UploadFile = File(...)):
    """Read a CSV file and return its contents as JSON."""
    try:
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        return JSONResponse(content={
            "data": json.loads(df.to_json(orient='records')),
            "columns": df.columns.tolist(),
            "shape": df.shape
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/describe")
async def describe(data: Dict[str, List[Any]]):
    """Generate descriptive statistics for the provided data."""
    try:
        df = pd.DataFrame(data)
        description = df.describe()
        return JSONResponse(content={
            "statistics": json.loads(description.to_json()),
            "dtypes": df.dtypes.astype(str).to_dict()
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/plot")
async def plot(
    data: Dict[str, List[Any]],
    kind: str = "line",
    x: Optional[str] = None,
    y: Optional[str] = None,
    title: Optional[str] = None
):
    """Generate various types of plots from the provided data."""
    try:
        df = pd.DataFrame(data)
        plt.figure(figsize=(10, 6))
        
        if kind == "line":
            if x is None or y is None:
                df.plot(kind="line")
            else:
                df.plot(kind="line", x=x, y=y)
        elif kind == "scatter":
            if x is None or y is None:
                raise HTTPException(status_code=400, detail="x and y are required for scatter plots")
            plt.scatter(df[x], df[y])
        elif kind == "histogram":
            if x is None:
                raise HTTPException(status_code=400, detail="x is required for histograms")
            df[x].hist()
        elif kind == "heatmap":
            sns.heatmap(df.corr(), annot=True, cmap='coolwarm')
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported plot type: {kind}")
        
        if title:
            plt.title(title)
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        plt.close()
        
        return JSONResponse(content={
            "plot": base64.b64encode(buffer.getvalue()).decode()
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/analyze")
async def analyze(data: Dict[str, List[Any]], columns: Optional[List[str]] = None):
    """Perform comprehensive analysis on the provided data."""
    try:
        df = pd.DataFrame(data)
        if columns:
            df = df[columns]
        
        # Basic statistics
        description = df.describe()
        
        # Correlation matrix
        correlation = df.select_dtypes(include=[np.number]).corr()
        
        # Data types and non-null counts
        info = {
            "dtypes": df.dtypes.astype(str).to_dict(),
            "non_null_counts": df.count().to_dict()
        }
        
        return JSONResponse(content={
            "description": json.loads(description.to_json()),
            "correlation": json.loads(correlation.to_json()),
            "info": info
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
