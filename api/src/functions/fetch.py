from workers import Response, fetch
import json


async def tm_fetch():
    print("Fetching data...")
    return await get_resturants()


async def get_resturants():
    payload = {
        "operationName": "GetRestaurants",
        "variables": {
            "input": {
                "filter": "NEARBY",
                "coordinates": {
                    "userLat": 43.66,
                    "userLng": -79.39,
                    "searchRadius": 1000,
                },
                "first": 20,
                "status": "OPEN",
            }
        },
        "query": """
query GetRestaurants($input: RestaurantsInput) {
  restaurants(input: $input) {
    pageInfo {
      hasNextPage
      endCursor
      __typename
    }
    totalCount
    nodes {
      ...RestaurantNodeFragment
      __typename
    }
    __typename
  }
}

fragment RestaurantNodeFragment on RestaurantNode {
  _id
  storeId
  isAvailable
  posVendor
  chaseMerchantId
  cateringHours {
    ...OperatingHoursFragment
    ...OperatingHoursFragment
    __typename
  }
  curbsideHours {
    ...OperatingHoursFragment
    __typename
  }
  cateringHours {
    ...OperatingHoursFragment
    __typename
  }
  timezone
  deliveryHours {
    ...OperatingHoursFragment
    __typename
  }
  diningRoomHours {
    ...OperatingHoursFragment
    __typename
  }
  distanceInMiles
  drinkStationType
  driveThruHours {
    ...OperatingHoursFragment
    __typename
  }
  driveThruLaneType
  email
  environment
  franchiseGroupId
  franchiseGroupName
  frontCounterClosed
  hasBreakfast
  hasBurgersForBreakfast
  hasCatering
  hasCurbside
  hasDelivery
  hasDineIn
  hasDriveThru
  hasTableService
  hasMobileOrdering
  hasLateNightMenu
  hasParking
  hasPlayground
  hasTakeOut
  hasWifi
  hasLoyalty
  id
  isDarkKitchen
  isFavorite
  isHalal
  isRecent
  latitude
  longitude
  mobileOrderingStatus
  name
  number
  parkingType
  phoneNumber
  physicalAddress {
    address1
    address2
    city
    country
    postalCode
    stateProvince
    stateProvinceShort
    __typename
  }
  playgroundType
  pos {
    vendor
    __typename
  }
  posRestaurantId
  restaurantImage {
    asset {
      _id
      metadata {
        lqip
        palette {
          dominant {
            background
            foreground
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
    crop {
      top
      bottom
      left
      right
      __typename
    }
    hotspot {
      height
      width
      x
      y
      __typename
    }
    __typename
  }
  restaurantPosData {
    _id
    __typename
  }
  status
  vatNumber
  timezone
  __typename
}

fragment OperatingHoursFragment on OperatingHours {
  friClose
  friOpen
  monClose
  monOpen
  satClose
  satOpen
  sunClose
  sunOpen
  thrClose
  thrOpen
  tueClose
  tueOpen
  wedClose
  wedOpen
  __typename
}""",
    }

    response = await fetch(
        "https://use1-prod-th.rbictg.com/graphql",
        method="POST",
        headers={"Content-Type": "application/json"},
        body=json.dumps(payload),
    )

    result = await Response.json(response)

    return result
