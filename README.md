# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Raphael Fluckiger | 295790 |
| Rached Toukko | 345904 |
| Paul Guillon | 314517 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (21st March, 5pm)

**10% of the final grade**

### Dataset

Our dataset consists of a collection of several CSV files taken from the following Kaggle datasets: 

- [Tourism by Mohamadreza Momeni](https://www.kaggle.com/datasets/imtkaggleteam/tourism)
- [Word Population Dataset by Sourav Banerjee](https://www.kaggle.com/datasets/iamsouravbanerjee/world-population-dataset)
- [Average Monthly surface temperature (1940-2024) by Samith Chimminiyan](https://www.kaggle.com/datasets/samithsachidanandan/average-monthly-surface-temperature-1940-2024)

We complement these three datasets with the two tables on UNESCO World Heritage properties. The first one comes from the [UNESCO website](https://whc.unesco.org/en/list/stat) and was extracted and converted to the CSV file uwh_by_country.csv. The second one is an XML file also from the UNESCO website available [here](https://whc.unesco.org/en/list/xml).

Here is a brief description of each CSV file that we will use:

|Dataset|Description|
|-----------|-----------|
|average-monthly-surface-temperature.csv|Average temperature by year and month between 1940 and 2024 for every country.|
|world_population.csv|Population data for every country between 1970 and 2022.|
|15-foreign-guests-in-hotels-and-similar-establishments.csv|Counts the number of foreign guests in tourism accommodations for every country over several years.|
|21-average-expenditures-of-international-tourists-domestically.csv|Inbound tourism expenditure per 1000 people for every country over several years.|
|23-international-tourist-trips-per-1000-people.csv|Inbound arrivals of tourists per 1000 people for every country over several years.|
|uwh_by_country.csv|Number of UNESCO World Heritage sites by country.|
|whc.unesco.org.xml|UNESCO World heritage sites XML with various fields (GPS coordinates, description, …).|

The different CSV files don’t have missing values and often use an ISO code for indexing countries. This will make it easy for us to pre-process the data and merge the tables for our needs. A preprocessing and preliminary analysis of the datasets is available in the 
Exploratory Data Analysis part.

### Problematic
**How to choose your destination for your next trip?**

This project aims at displaying useful information for a trip on an interactive world map. Selected countries will show information (tourism data, UNESCO world heritage locations, average temperature, mean expenditure of stay, ...) in a single click and will also be displayed in different colors according to various criteria (selected by the user), so you can have an idea at a glance. 

It would also be interesting to add the carbon footprint of the flight alongside the other information so the user can be aware of this when looking for their next trip. This part would be done using an API that computes the carbon footprint for us ([Carbon Footprint](https://connect.myclimate.org/api-overview)).

As a bonus, we also had the idea of plotting a treemap ([Treemap example](https://finviz.com/map.ashx?t=sec_all)) chart per attribute to visualize the countries advantages in an unconventional way.
The project aims at making it simple to plan your next trip while keeping track of different parameters that might affect the selected destination. The target audience for this project is travelers in general, but also those who are concerned about their ecological footprint and still want to travel. 


### Exploratory Data Analysis

The first exploratory analysis are in this [notebook](https://github.com/com-480-data-visualization/geo-viz/blob/master/eda/exploratory_analysis.ipynb).

### Related work


 - What others have already done with the data?
 
https://championtraveler.com/travel-weather-map/travel-weather-map-detailed-celsius/
 - Why is your approach original?
   
While existing tools focus on specific aspects such as weather or tourism statistics, our project aims to integrate multiple datasets, tourist arrivals, weather, expenditure per tourist, number of UNESCO World Heritage sites... into a single interactive map. This approach allows users to consider various factors simultaneously when choosing a travel destination. And adding carbon footprint data that can help travelers be more mindful of their environmental impact.
 - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
   
https://whitelabel.greatescape.co/landing

https://ourworldindata.org/tourism


## Milestone 2 (18th April, 5pm)

**10% of the final grade**

Second milestone in  PDF format [here](milestone2.pdf)

Website skeleton available [here](https://com-480-data-visualization.github.io/geo-viz/).

Some sketches are available as PDFs in the [sketches](sketches) folder. The sketches are not final but give a visual idea of the project's direction.

## Milestone 3 (30th May, 5pm)

**80% of the final grade**

Screencast available [here](https://www.youtube.com/watch?v=jnTis2ZXuUw).

Process book available [here](https://github.com/com-480-data-visualization/geo-viz/blob/master/Process_book.pdf)

Website hosted on github pages available [here](https://com-480-data-visualization.github.io/geo-viz/)

